# TexQtic — Dashboard Matrix
## Control Plane · Tenant (B2B Professional) · White-Label

| Field     | Value                                                              |
|-----------|--------------------------------------------------------------------|
| **Date**  | 2026-02-24                                                         |
| **Status**| DRAFT — aligned with Doctrine Addendum + G-W3-AUDIT-001 baseline  |
| **Scope** | Canonical surface definition for all Wave 4+ dashboard work        |
| **Links** | `docs/DOCTRINE_ADDENDUM_POSITIONING_MONEY.md` · `docs/strategy/TENANT_DASHBOARD_MATRIX.md` |

> **This is the authoritative dashboard surface definition.** No module ships without a declared entry here. See `docs/strategy/TENANT_DASHBOARD_MATRIX.md` for the full 4-tenant-type matrix including AGGREGATOR and B2C.

---

## I. Control Plane (SuperAdmin)

**Realm:** `control`  
**Shell:** `layouts/SuperAdminShell.tsx`  
**Actor roles:** `SUPER_ADMIN`, `SUPPORT`

The SuperAdmin control center is organized into **4 Control Towers**. Each tower is a distinct governance concern. No tower bleeds into another's domain.

---

### 🏗 Platform Control Tower

> *Purpose: Manage who is on the platform, its capabilities, and its release surface.*

| Module            | Description                                                         | Status            |
|-------------------|---------------------------------------------------------------------|-------------------|
| Tenant Registry   | List, search, filter all tenants; tier + status                    | ✅ Implemented    |
| Provisioning      | Create new org + primary owner atomically                          | ✅ API; UI stub   |
| Domains           | Verify/manage tenant custom domains                                 | ⏳ Partial        |
| Feature Flags     | Global + per-tenant flags (`OP_*` + product flags)                 | ✅ Implemented    |
| Kill Switch       | Emergency platform disable (`KILL_SWITCH_ALL`, `OP_PLATFORM_READ_ONLY`) | ✅ Via flags |
| Release Controls  | Staged rollout, flag-gated feature activation                      | ⏳ Partial        |

---

### ⚖️ Governance & Risk Tower

> *Purpose: Enforce compliance, dispute resolution, audit integrity, and access policy.*

| Module            | Description                                                         | Status            |
|-------------------|---------------------------------------------------------------------|-------------------|
| Compliance Queue  | Cross-tenant compliance tasks awaiting admin action                 | ✅ Implemented    |
| Dispute Cases     | Inter-tenant disputes escalated to platform                         | ✅ Implemented    |
| Audit Logs        | Immutable cross-tenant audit trail                                  | ✅ Implemented    |
| Impersonation     | Start/stop/audit admin impersonation of tenant users                | ✅ API; UI stub   |
| Admin RBAC        | Manage admin user roles and permissions                             | ✅ Implemented    |
| AI Governance     | Usage policy, budget caps, explainability artifacts                 | ✅ Surface exists |

---

### 💰 Finance Tower

> *Purpose: Platform-level fee visibility, billing, and settlement record-keeping. NEVER moves money.*

| Module                 | Description                                                   | Status         |
|------------------------|---------------------------------------------------------------|----------------|
| Tenant Plans           | Per-tenant subscription status, tier, billing alerts          | ⏳ Stub        |
| Fee Ledger             | Platform fee schedule and earned fee records                  | ⏳ Stub        |
| Transaction Fees       | Per-transaction fee visibility (where platform earns)         | ⏳ Not started |
| Settlement Status      | Settlement acknowledgement records — visibility only          | ⏳ Not started |

> **Constraint:** Finance Tower never moves money. System-of-record only. See `docs/DOCTRINE_ADDENDUM_POSITIONING_MONEY.md §IV`.

---

### ⚙️ Operations Tower

> *Purpose: Day-to-day platform health, support cases, escalations, and observability.*

| Module            | Description                                                         | Status            |
|-------------------|---------------------------------------------------------------------|-------------------|
| System Health     | Live platform health indicators                                     | ✅ Implemented    |
| Event Stream      | Real-time platform event log                                        | ✅ Implemented    |
| Escalations       | High-priority tenant incidents routed to ops team                   | ⏳ Stub           |
| Support Cases     | Tenant-reported cases managed by support                            | ⏳ Stub           |

---

## II. Tenant — B2B Professional

**Realm:** `tenant`  
**Shell:** `B2BShell` in `layouts/Shells.tsx`  
**Actor roles:** `OWNER`, `ADMIN`, `MEMBER`  
**Plan:** PROFESSIONAL (primary target for Wave 4 module completion)

**Current repo-truth note:** The B2B tenant surface is materially broader than the original Wave 4
stub baseline reflected here. The reconciled rows below remove the stale authority signals that
would otherwise understate current tenant reality.

---

### TA — Admin

> *Org identity, branding, access management, external integrations.*

| Module           | Description                                       | Wave 4 | Status                      |
|------------------|---------------------------------------------------|--------|-----------------------------|
| Org Profile      | Name, type, status, plan                          | P1     | ⏳ Stub                     |
| Branding         | Custom domain, logo, theme colors                 | P1     | ✅ API done; UI partial     |
| Membership/RBAC  | Invite, manage roles, revoke access               | P1     | ✅ API done; UI exists      |
| Integrations     | Webhook endpoints, API keys                       | P3     | ⏳ Not started              |

---

### TO — Operations

> *Active trade workflow — orders, RFQs, negotiations, compliance, fulfillment.*

| Module               | Description                                               | Wave 4 | Status                         |
|----------------------|-----------------------------------------------------------|--------|--------------------------------|
| Orders               | View all orders + status tracking                         | P1     | ✅ Present in current tenant surface |
| RFQs                 | Create, respond to, and track RFQs                        | P1     | ✅ Materially real in current tenant surface |
| Negotiations         | Counter-offers, approvals, version history                | P2     | ⏳ Stub — product-defined first |
| Compliance Tasks     | Tenant-facing compliance items pending action             | P1     | ✅ Present in current tenant surface |
| Fulfillment          | Shipment status, logistics updates                        | P2     | ⏳ Not started                 |

---

### TF — Finance

> *Financial visibility — invoices, fees, settlement status. No fund movement.*

| Module                  | Description                                           | Wave 4 | Status         |
|-------------------------|-------------------------------------------------------|--------|----------------|
| Invoice List            | Issue and track invoices                              | P2     | ⏳ Stub — product-defined |
| Fee Visibility          | Platform fees applied to orders                       | P2     | ⏳ Not started |
| Settlement Acknowledgment | Record and acknowledge payment events               | P2     | ⏳ Not started |

---

### TS — Sales / Products

> *Catalog, pricing, collections.*

| Module         | Description                                              | Wave 4 | Status                   |
|----------------|----------------------------------------------------------|--------|--------------------------|
| Catalog        | List, create, edit catalog items + pricing               | P1     | ✅ Materially real in current tenant surface  |
| Pricing Rules  | MOQ, tiered pricing, bulk discounts                      | P2     | ⏳ Stub                  |
| MOQ            | Minimum order quantity rules per catalog item            | P2     | ⏳ Stub                  |
| Collections    | Logical product groupings                                | P3     | ⏳ Not started           |

---

### TC — Client Communication

> *Buyer/supplier threads, approvals, dispute view, notifications.*

| Module           | Description                                              | Wave 4 | Status         |
|------------------|----------------------------------------------------------|--------|----------------|
| Message Threads  | Buyer/supplier communications                            | P2     | ⏳ Not started |
| Approvals        | Formal approval workflows (sample, spec, etc.)           | P2     | ⏳ Not started |
| Dispute View     | Raise and track disputes (tenant-side)                   | P2     | ⏳ Not started |
| Notifications    | In-app notification center                               | P1     | ⏳ Not started |

---

## III. White-Label Tenant

**Realm:** `tenant`  
**Shell:** `WhiteLabelShell` in `layouts/Shells.tsx`  
**Actor roles:** `OWNER`, `ADMIN`, `MEMBER` (back-office) · `BUYER`, `GUEST` (storefront consumers)

WL tenants require **two distinct surfaces**. The storefront consumer UX is a separate rendering
concern, and the operator/admin back-office surface is already materially present in current repo
truth.

---

### 1️⃣ Storefront — Consumer-Facing

> *Rendered in the WL tenant's branded domain. Out of scope for back-office dashboard matrix.*

| Feature           | Description                               |
|-------------------|-------------------------------------------|
| Product Browsing  | Branded catalog, filtering, search        |
| Cart              | Consumer cart management                  |
| Checkout          | Order placement (tenant-to-consumer)      |
| Orders            | Consumer order history and status         |

---

### 2️⃣ Store Admin — Back-Office

> **Current repo-truth note:** WL tenants already have a real operator/admin back-office surface.
> This section should no longer be read as if WL Store Admin were still a future-add entry point.

---

#### TA — Admin

| Module          | Description                                        | Wave 4 | Status                          |
|-----------------|----------------------------------------------------|--------|---------------------------------|
| Store Profile   | Brand name, logo, theme colors                     | P1     | ✅ Present in current WL admin surface   |
| Branding        | Theme, logo, storefront appearance                 | P1     | ✅ API done; UI stub            |
| Domain          | Custom domain config and verification              | P1     | ⏳ Stub                         |
| Staff           | Invite and manage store staff (ADMIN / MEMBER)     | P1     | ✅ API done                     |

---

#### TO — Operations

| Module               | Description                                         | Wave 4 | Status         |
|----------------------|-----------------------------------------------------|--------|----------------|
| Order Management     | View all storefront orders + status                 | P1     | ✅ Present in current WL admin surface        |
| Fulfillment          | Track outbound shipping, logistics updates          | P2     | ⏳ Not started |
| Returns              | Handle consumer return requests                     | P2     | ⏳ Not started |

---

#### TF — Finance

| Module            | Description                                           | Wave 4 | Status         |
|-------------------|-------------------------------------------------------|--------|----------------|
| Revenue Summary   | Orders revenue overview (not fund movement)           | P2     | ⏳ Not started |
| Fee Visibility    | Platform fees applied to storefront orders             | P2     | ⏳ Not started |

---

#### TS — Sales / Products

| Module         | Description                                              | Wave 4 | Status                      |
|----------------|----------------------------------------------------------|--------|-----------------------------|
| Products       | Manage storefront product listings                       | P1     | ✅ Present in current WL admin surface |
| Collections    | Curated product collections / campaigns                  | P1     | ✅ Present in current WL admin surface                     |
| Promotions     | Discount codes, sale prices                              | P2     | ⏳ Not started              |

---

#### TC — Client Communication

| Module            | Description                                           | Wave 4 | Status         |
|-------------------|-------------------------------------------------------|--------|----------------|
| Customer Messages | Handle consumer inquiries                             | P2     | ⏳ Not started |
| Notifications     | Order alerts, inventory alerts, staff updates         | P1     | ⏳ Not started |

---

## IV. Wave 4 Priority Summary

| Priority | Surface        | Domain | Module                                                    |
|----------|----------------|--------|-----------------------------------------------------------|
| **P1**   | ALL tenants    | TA     | Org Profile / Store Profile                               |
| **P1**   | ALL tenants    | TA     | Membership UI completion (invite + role management)       |
| **P1**   | ALL tenants    | TS     | Catalog Management UI (API exists)                        |
| **P1**   | ALL tenants    | TO     | Order List (basic view)                                   |
| **P1**   | ALL tenants    | TC     | Notifications center                                      |
| **P1**   | WHITE_LABEL    | TA     | Store Branding UI (API exists)                            |
| **P1**   | WHITE_LABEL    | TS     | Collections (WL-specific)                                 |
| **P1**   | WHITE_LABEL    | TA/TO  | Continue reconciling live Store Admin operator surface truth |
| **P1**   | B2B            | TO     | Compliance Tasks surface                                  |
| **P1**   | B2B            | TO     | RFQ Management (product definition gate first)            |
| **P1**   | Control Plane  | Finance | Tenant Plans + Fee Ledger stubs                          |
| **BUG**  | ALL (tenant)   | TO     | Fix `POST /api/tenant/checkout` HTTP 500 — blocks all commerce modules |

---

## V. Anti-Drift Checklist (Required Before Any Module Ships)

Before any module is implemented, all must be checked:

- [ ] Realm declared: `control` / `tenant` / `public`
- [ ] Actor roles and permission level per role defined
- [ ] Tenant types scoped: ALL / B2B / WHITE_LABEL / AGGREGATOR / B2C
- [ ] Data authority boundary declared (tables + RLS context)
- [ ] API endpoints listed or stubbed
- [ ] Audit events listed (SNAKE_CASE)
- [ ] Monetization touchpoint identified (subscription / tx fee / none)
- [ ] Anti-bazaar check passed: structured + permissioned trade? Or open listing?
- [ ] Doctrine v1.4 alignment confirmed: `app.org_id` scoping, correct RLS role
- [ ] Entry exists in this matrix

---

*Document last updated: 2026-02-24*  
*Cross-references: `docs/DOCTRINE_ADDENDUM_POSITIONING_MONEY.md` · `docs/strategy/CONTROL_CENTER_TAXONOMY.md` · `docs/strategy/TENANT_DASHBOARD_MATRIX.md` · `docs/status/TEXQTIC_CURRENT_STATE__2026-02-24.md`*
