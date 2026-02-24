# TexQtic — Pause & Current State Snapshot

| Field       | Value                                                          |
|-------------|----------------------------------------------------------------|
| **Date**    | 2026-02-24                                                     |
| **Status**  | PAUSED FOR STRATEGY ALIGNMENT (post G-W3-ROUTING-001)          |
| **Purpose** | Freeze current reality so roadmap iteration doesn't rewrite history. |
| **Author**  | TexQtic Engineering + Product                                  |

---

## A. Header

This document is a **living snapshot** — updated at major pause/milestone points only. Its job is to be the single source of truth for "where we actually are" before the next wave of features expands surface area.

> **Anti-drift rule:** No new dashboard module, no new Wave, no new tenant-type expansion begins until this doc has been reviewed and its Decision Backlog (Section E) has been adjudicated.

---

## B. Current Platform State (Facts Only)

### Frontend

| Dimension         | Reality                                                                                               |
|-------------------|-------------------------------------------------------------------------------------------------------|
| Framework         | Vite + React SPA — **not** file-based routing                                                         |
| Routing model     | `App.tsx` state-machine router; "dashboards" are **states + shells**, not URL routes                  |
| Realms            | Control Plane + Tenant shells (AGGREGATOR / B2B / B2C / WHITE_LABEL)                                  |
| Shell files       | `layouts/Shells.tsx` (tenant subtypes), `layouts/SuperAdminShell.tsx` (control plane)                 |
| Audit baseline    | `docs/audits/G-W3-AUDIT-001-ui-routing-contract.md`                                                   |

### Control Plane (SuperAdmin Realm)

The SuperAdmin shell has the most complete navigation surface. The following sidebar views exist with non-stub implementations as of audit baseline:

| Category          | Views                                                                                  |
|-------------------|----------------------------------------------------------------------------------------|
| **Tenants**       | Tenant Registry, Tenant Details                                                        |
| **Governance**    | Feature Flags, Compliance Queue, Dispute Cases, Audit Logs                             |
| **Finance**       | Finance Ops                                                                            |
| **Operations**    | System Health, Event Stream, Admin RBAC, Architecture Blueprints                       |
| **AI**            | AI Governance                                                                          |
| **Platform**      | API Docs, Data Model, Middleware Scaffold, Backend Skeleton                            |

Reference: `components/ControlPlane/`

### Tenant Experience (by shell type)

| Shell Type      | Current State                                                                                                                             |
|-----------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| **AGGREGATOR**  | Aggregator-specific shell; scope not yet fully audited for G-W3                                                                           |
| **B2B**         | Catalog + Members + floating Settings + Cart present; Negotiations/Invoices/RFQs were **historically stubbed** in audit baseline          |
| **B2C**         | Basic consumer flow; audit baseline showed limited sidebar depth                                                                          |
| **WHITE_LABEL** | Storefront-first experience. Audit baseline showed **no real "dashboard" navigation surface** beyond shell navigation patterns             |

Reference: `docs/audits/G-W3-AUDIT-001-ui-routing-contract.md`

### Backend (API + Database)

| Dimension           | Reality                                                                                                |
|---------------------|--------------------------------------------------------------------------------------------------------|
| Framework           | Fastify 5 on `:3001`                                                                                   |
| Database            | Supabase-hosted PostgreSQL (remote is canonical/authoritative; local Postgres is **never** authoritative) |
| ORM                 | Prisma (repo-pinned; `pnpm -C server exec prisma`)                                                    |
| Auth                | JWT dual-realm (admin realm JWT + tenant realm JWT), X-Texqtic-Realm header enforcement                |
| RLS                 | Enforced; `texqtic_app` role + `app.org_id` / `app.is_admin` / `app.realm` session vars               |
| Doctrine            | v1.4 — `docs/doctrine/doctrine_v1_4_part_*.md`; canonical tenancy key is `org_id` (NOT `tenant_id`)  |

### Git + Test State

| Item                     | Value                                                                          |
|--------------------------|--------------------------------------------------------------------------------|
| HEAD commit              | `9a73dc3` — `chore(fmt): restore formatter whitespace in routing-001.test.ts` |
| Working tree             | **CLEAN** — 0 uncommitted files                                                |
| G-W3-ROUTING-001 commits | 9 commits (`161178b` → `9a73dc3`)                                             |
| Smoke test script        | `tests/smoke-w3-routing-001.sh` + `tests/smoke-w3-routing-001.md`             |

---

## C. What Wave 3 Fixed vs What Remains Product-Scope Incomplete

### Wave 3 Fixed (routing + wiring layer)

- ✅ Realm guard (`X-Texqtic-Realm` enforcement) — admin token rejected on tenant routes and vice versa
- ✅ Impersonation start/stop (`POST /api/control/impersonation/start|stop`) — session lifecycle + audit event
- ✅ Tenant provisioning (`POST /api/control/tenants/provision`) — atomic tenant+user+membership creation
- ✅ Control-plane mechanics (tenant list, tenant detail with memberships, feature flags, audit logs)
- ✅ Tenant wiring (catalog, cart, branding PUT, invite member, list memberships)
- ✅ Smoke test baseline established + run locally (12 of 13 checks PASS)

### Still "Product Incomplete" (by design, not a bug)

| Area                     | Gap                                                                                                  | Source                      |
|--------------------------|------------------------------------------------------------------------------------------------------|-----------------------------|
| B2B sidebar modules      | Negotiations, Invoices, RFQs, Client Comms are stubbbed/missing — these need product definition, not just wiring | Audit baseline G-W3-AUDIT-001 |
| WHITE_LABEL back-office  | No "Store Admin" surface exists (catalog/collections/orders/branding in WL context)                  | Audit baseline G-W3-AUDIT-001 |
| Checkout (tenant)        | `POST /api/tenant/checkout` returning HTTP 500 — pre-existing bug, not a routing issue              | Local smoke test 2026-02-24   |
| Cart item count          | `POST /api/tenant/cart/items` returns `items: []` in response (item is saved, response shape is off) | Local smoke test 2026-02-24   |
| AGGREGATOR shell         | Scope not formally audited in G-W3 gate                                                             | —                             |
| Realm header permissive  | Missing `X-Texqtic-Realm` does not block requests (header is enforced only when present)            | Local smoke test 2026-02-24   |

---

## D. Why We Are Pausing

The next body of work is **not** "implement more endpoints." It is:

1. **Platform identity** — what TexQtic *is* determines which dashboard surfaces are required
2. **Monetization model** — subscription vs commission vs hybrid shapes the Finance Tower + tenant billing flows
3. **Settlement ownership** — "not fintech now" must be explicitly bounded in the architecture
4. **AI governance stance** — advisory vs automated determines what the AI Governance panel must enforce

These choices determine:
- What the SuperAdmin control center **must** include
- What each tenant type's dashboards **must** include
- How to avoid becoming a commodity open bazaar

**Expanding tenant dashboards without these answers will produce orphaned modules with no clear data authority boundaries, monetization hooks, or audit trails.** This contradicts Doctrine v1.4 directly.

---

## E. Decision Backlog (Must be Resolved Before Wave 4 Expands UI)

> Each item below is a **blocking decision**. No module that depends on it enters Wave 4 scope until it is answered and recorded in `docs/doctrine/` or a linked ADR.

| # | Decision                    | Question                                                                                                             | Best Default (see Section F)         | Status     |
|---|-----------------------------|----------------------------------------------------------------------------------------------------------------------|--------------------------------------|------------|
| 1 | Platform positioning        | Infrastructure layer? Governed exchange? SaaS? Open bazaar?                                                         | Hybrid B2B + White-label SaaS        | ⏳ OPEN    |
| 2 | Monetization model          | Subscription only? Commission only? Hybrid?                                                                          | Hybrid (subscription + tx fee)       | ⏳ OPEN    |
| 3 | Settlement ownership        | Escrow? Direct tenant-to-tenant? Platform-managed?                                                                   | Direct T2T now; managed hook later   | ⏳ OPEN    |
| 4 | AI stance                   | Advisory only? Automated lifecycle decisions?                                                                        | Advisory now; gated automation later | ⏳ OPEN    |
| 5 | WL back-office scope        | Does WhiteLabel tenant get a "Store Admin" panel in v1?                                                              | Yes — minimal (catalog/orders/brand) | ⏳ OPEN    |
| 6 | B2B module surface          | Which of Negotiations/Invoices/RFQs/Client Comms enter Wave 4 vs Wave 5+?                                           | TBD after positioning locked         | ⏳ OPEN    |
| 7 | Checkout ownership          | Fix `POST /api/tenant/checkout` bug in Wave 4 or defer?                                                             | Fix before any commerce-related Wave | ⏳ OPEN    |

---

## F. Anti-Drift Guardrails

Any new dashboard module introduced in Wave 4+ **must** declare all of the following before implementation begins:

```markdown
## Module Declaration: [Module Name]

- **Realm:** control | tenant | public
- **Actor roles:** SUPER_ADMIN | SUPPORT | OWNER | ADMIN | MEMBER | BUYER | GUEST
- **Tenant types applicable:** ALL | AGGREGATOR | B2B | B2C | WHITE_LABEL
- **Data authority boundary:** Which DB tables, which RLS role context
- **Audit events required:** [list SNAKE_CASE event names]
- **Monetization touchpoint:** subscription value | transaction fee trigger | none
- **Anti-bazaar check:** Does this module create permissioned, structured trade? OR open listing behavior?
- **Doctrine v1.4 alignment:** org_id scoping confirmed? tenancy context variables correct?
```

---

## G. Strategic Positioning Doctrine (Best Defaults — To Be Ratified)

> These are recommended defaults derived from the existing Doctrine and audit baseline. They become binding once ratified by product leadership and recorded in `docs/doctrine/`.

### 1. Platform Positioning

**Best default: Infrastructure layer + governed exchange, delivered as Hybrid B2B + White-label SaaS.**

TexQtic is **not** an open listing site. It is a workflow + compliance + authority system across the supply chain (yarn → fabric → garment), where trade is:
- **Permissioned** — only vetted actors participate
- **Structured** — RFQ → negotiation → compliance gate → fulfillment
- **Governed** — every state transition is auditable

This directly prevents "common bazaar" drift: the platform creates no value unless trade is structured.

### 2. Monetization Model

**Best default: Hybrid**

| Stream               | Trigger                                                                               |
|----------------------|---------------------------------------------------------------------------------------|
| Subscription         | Tenant "operating system" value — workflows, compliance, dashboards, integrations     |
| Transaction fee      | Only when TexQtic provides measurable trade value: matched RFQ, verified fulfillment, governed settlement visibility |

This keeps unit economics stable and does not force growth-at-all-cost bazaar take-rate behavior.

### 3. Settlement Ownership

Given "not fintech now":

| Phase   | Model                                                                                              |
|---------|----------------------------------------------------------------------------------------------------|
| **Now** | Direct tenant-to-tenant settlement. Platform is system-of-record for **workflow**, not funds.      |
| **Hook** | Bank/PSP partnership hookpoints designed in architecture but not activated                         |
| **Future** | Optional escrow / milestone payments only after governance + compliance layers are mature        |

### 4. AI Stance

**Best default: Advisory now, gated automation later**

| Capability                          | Stance                                                                                            |
|-------------------------------------|---------------------------------------------------------------------------------------------------|
| Matching / risk surfacing           | Advisory AI — suggestions, not decisions                                                           |
| Negotiation guidance                | Advisory AI — surfaced to human actors                                                             |
| Automated lifecycle decisions       | **Gated**: must be behind explicit policy + auditable reasoning artifacts + maker-checker for any irreversible action |

This matches the Doctrine audit's current framing: AI governance is partial, explainability gaps flagged, cautious stance already implied.

Reference: `docs/DOCTRINE_V1_4_MAPPING_AUDIT.md`

---

## H. Next Iteration Outputs (Pre-Wave 4 Gate)

Three documents must be produced before Wave 4 begins. Stubs are in `docs/strategy/`:

| Output | File | Status |
|--------|------|--------|
| 1 — Platform Doctrine Addendum (Positioning & Money) | [`docs/strategy/PLATFORM_DOCTRINE_ADDENDUM.md`](../strategy/PLATFORM_DOCTRINE_ADDENDUM.md) | ⏳ STUB |
| 2 — Control Center Taxonomy | [`docs/strategy/CONTROL_CENTER_TAXONOMY.md`](../strategy/CONTROL_CENTER_TAXONOMY.md) | ⏳ STUB |
| 3 — Tenant Dashboard Matrix | [`docs/strategy/TENANT_DASHBOARD_MATRIX.md`](../strategy/TENANT_DASHBOARD_MATRIX.md) | ⏳ STUB |

All three must be reviewed against the Decision Backlog (Section E) and the Module Declaration guardrails (Section F) before any Wave 4 implementation ticket is assigned.

---

## I. Known Bugs to Triage Before Wave 4

| Bug | Endpoint | Symptom | Priority |
|-----|----------|---------|----------|
| Checkout 500 | `POST /api/tenant/checkout` | `Cannot read properties of undefined (reading 'create')` | P1 — blocks commerce flows |
| Cart items response | `POST /api/tenant/cart/items` | Returns `items: []` despite item being saved | P2 — UX/API contract issue |
| Tenant provisioning | `POST /api/control/tenants/provision` | Prisma transaction timeout on `membership.create` phase | P1 — blocks onboarding |
| Missing realm header | `X-Texqtic-Realm` absent | Requests route through without rejection | P2 — security hardening |

---

*Document last updated: 2026-02-24*
*Next update trigger: Decision Backlog items resolved OR Wave 4 scope locked*
