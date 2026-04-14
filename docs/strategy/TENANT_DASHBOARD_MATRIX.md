# TexQtic — Tenant Dashboard Matrix

| Field     | Value                                                              |
|-----------|--------------------------------------------------------------------|
| **Date**  | 2026-02-24                                                         |
| **Status**| DRAFT — pending ratification and Wave 4 scope lock                 |
| **Realm** | tenant                                                             |
| **Links** | `docs/status/TEXQTIC_CURRENT_STATE__2026-02-24.md`, `docs/strategy/PLATFORM_DOCTRINE_ADDENDUM.md` |

> This matrix is a preserved descriptive dashboard matrix for each covered family, category, or capability workspace. It remains a useful evidence surface for dashboard scope comparison, but it should not be treated as the current standalone canonical dashboard authority or sole product scope boundary for later work. **No tenant dashboard module ships without a row in this matrix.**
> Alignment note: B2B, B2C, and Aggregator are the governed commercial access models.
> White-label is an overlay capability and deployment/experience model, not a separate board-level
> pillar or primary tenant-mode family.

---

## Organization Principle

Every tenant dashboard is organized into **5 Dashboard Domains**. The same 5 domains apply across each covered family, category, or capability workspace — but the specific modules and their active vs stub vs planned status vary by surface.

| Domain | Code | Purpose |
|--------|------|---------|
| **Admin** | `TA` | Org profile, branding, domains, membership/RBAC, integrations |
| **Operations** | `TO` | Orders, RFQs/negotiations, fulfillment, compliance tasks |
| **Finance** | `TF` | Invoices, payouts (visibility only), fees, settlement status |
| **Sales/Products** | `TS` | Catalog, pricing, MOQ, collections, merchandising |
| **Client Communication** | `TC` | Buyer/supplier threads, approvals, dispute handling, notifications |

---

## Family / category / capability workspace coverage

### B2B family — Governed Exchange Operator

**Actor roles:** OWNER, ADMIN, MEMBER

**Shell:** `B2BShell` in `layouts/Shells.tsx`

**Current repo-truth note:** The B2B tenant surface is materially broader than the original Wave 4
stub baseline reflected in earlier planning. The reconciled rows below remove the stale authority
signals that would otherwise understate current tenant reality.

| Domain | Module | Description | Wave 4 | Status |
|--------|--------|-------------|--------|--------|
| **TA — Admin** | Org Profile | Name, type, status, plan | P1 | ⏳ Stub |
| | Domains & Branding | Custom domain, logo, theme | P1 | ✅ API done; UI partial |
| | Membership & RBAC | Invite, role management, revoke | P1 | ✅ API done; UI exists |
| | Integrations | Webhook endpoints, API keys | P3 | ⏳ Not started |
| **TO — Operations** | Order List | View all orders + status | P1 | ✅ Present in current tenant surface |
| | RFQ Management | Create, respond, track RFQs | P1 | ✅ Materially real in current tenant surface |
| | Negotiation Workspace | Counter-offers, approvals, version history | P2 | ⏳ Stub — product-defined |
| | Fulfillment Tracker | Shipment status, logistics updates | P2 | ⏳ Not started |
| | Compliance Tasks | Tenant-facing compliance items pending action | P1 | ✅ Present in current tenant surface |
| **TF — Finance** | Invoice List | Issue and track invoices | P2 | ⏳ Stub — product-defined |
| | Fee Visibility | Platform fees applied to orders | P2 | ⏳ Not started |
| | Settlement Status | Acknowledge payment events (no fund move) | P2 | ⏳ Not started |
| | Payout Records | History of settlement acknowledgements | P3 | ⏳ Not started |
| **TS — Sales/Products** | Catalog Management | List, create, edit catalog items + pricing | P1 | ✅ Materially real in current tenant surface |
| | Pricing Rules | MOQ, tiered pricing, bulk discounts | P2 | ⏳ Stub |
| | Collection Groups | Logical product groupings | P3 | ⏳ Not started |
| **TC — Client Comms** | Message Threads | Buyer/supplier communications | P2 | ⏳ Not started |
| | Approval Requests | Formal approval workflows (sample, spec, etc.) | P2 | ⏳ Not started |
| | Dispute Handling | Raise and track disputes (tenant-side view) | P2 | ⏳ Not started |
| | Notifications | In-app notification center | P1 | ⏳ Not started |

---

### White-Label Overlay (Brand-Owned Storefront Operator)

**Actor roles:** OWNER, ADMIN, MEMBER

**Applies to:** B2B or B2C tenants with white-label capability enabled

**Shells:** `WhiteLabelShell` and `WhiteLabelAdminShell` in `layouts/Shells.tsx`

**Context:** WL tenants own a branded storefront and already have a real operator/admin back-
office surface alongside storefront-facing navigation. This matrix covers the brand-operator
overlay only and should not be read as if white-label were a separate canonical tenant type or
board-level pillar.

| Domain | Module | Description | Wave 4 | Status |
|--------|--------|-------------|--------|--------|
| **TA — Admin** | Store Profile | Brand name, logo, theme colors, domain | P1 | ✅ Present in current WL admin surface |
| | Membership | Invite and manage store staff | P1 | ✅ API done |
| | Integrations | Webhook, inventory sync hooks | P3 | ⏳ Not started |
| **TO — Operations** | Order Management | View all storefront orders + status | P1 | ✅ Present in current WL admin surface |
| | Returns & Fulfillment | Track outbound + handle return requests | P2 | ⏳ Not started |
| | Compliance Tasks | Brand/product compliance requirements | P2 | ⏳ Not started |
| **TF — Finance** | Revenue Dashboard | Orders revenue summary (not fund movement) | P2 | ⏳ Not started |
| | Fee Visibility | Platform fees on storefront orders | P2 | ⏳ Not started |
| | Payouts (visibility) | Settlement acknowledgements | P3 | ⏳ Not started |
| **TS — Sales/Products** | Catalog / Products | Manage storefront product listings | P1 | ✅ Present in current WL admin surface |
| | Collections | Curated product collections / campaigns | P1 | ✅ Present in current WL admin surface |
| | Pricing & Promotions | Price rules, discount codes | P2 | ⏳ Not started |
| | Merchandising | Homepage layout, featured products | P2 | ⏳ Not started |
| **TC — Client Comms** | Customer Messages | Handle customer inquiries | P2 | ⏳ Not started |
| | Notifications | Order alerts, inventory alerts | P1 | ⏳ Not started |

> **WL-specific note:** The storefront-consumer-facing experience is NOT part of this matrix. These modules are for the *brand operator* managing their store. Storefront consumer UX is a separate rendering surface.

---

### Aggregator workspace — Curated Directory & Intent Handoff

**Actor roles:** OWNER, ADMIN, MEMBER

**Shell:** `AggregatorShell` in `layouts/Shells.tsx`

**Context:** Aggregators provide curated discovery, qualification, and intent routing across
suppliers and buyers. They may expose network visibility and routing support, but they are not the
primary owners of downstream transaction execution, settlement, or platform workflow
orchestration.

| Domain | Module | Description | Wave 4 | Status |
|--------|--------|-------------|--------|--------|
| **TA — Admin** | Org Profile | Aggregator identity, tier, domains | P1 | ⏳ Stub |
| | Membership & RBAC | Staff + partner access management | P1 | ✅ API done |
| | Discovery-safe supplier directory | Discovery-safe supplier directory and counterparty inspection only | P2 | ⏳ Product-defined |
| | Discovery-safe buyer directory | Discovery-safe buyer directory and counterparty inspection only | P2 | ⏳ Product-defined |
| **TO — Operations** | Shared downstream order continuation | Shared downstream order visibility after handoff | P1 | ⏳ Stub |
| | Qualified intent handoff | Qualified RFQ intake and downstream handoff | P1 | ⏳ Product-defined |
| | Downstream negotiation continuation | Visibility into downstream negotiation continuation after handoff | P2 | ⏳ Product-defined |
| | Compliance Dashboard | Compliance posture across network | P2 | ⏳ Stub |
| **TF — Finance** | Historical finance overhang (non-canonical) | Retained only as a pre-normalization note; not a current Aggregator-owned finance function | N/A | Historical note |
| | Invoice Management | Issue/receive invoices across parties | P2 | ⏳ Not started |
| | Settlement Visibility | Multi-party settlement tracking | P3 | ⏳ Not started |
| **TS — Sales/Products** | Discovery catalog / counterparty inspection | Discovery-safe catalog and counterparty inspection across supplier sources only | P1 | ⏳ Stub |
| | Pricing Governance | Price floors/ceilings across network | P2 | ⏳ Product-defined |
| **TC — Client Comms** | Downstream communication continuation | Shared downstream communication continuation after handoff | P2 | ⏳ Not started |
| | Approval Chains | Complex multi-party approval workflows | P2 | ⏳ Product-defined |
| | Network Notifications | Cross-party event notifications | P1 | ⏳ Not started |

---

### B2C family — Tenant-Branded Commerce

**Actor roles:** OWNER, ADMIN, MEMBER (with separate public-safe storefront visitors on the consumer-facing surface)

**Shell:** `B2CShell` in `layouts/Shells.tsx`

**Context:** B2C tenants may expose public-safe storefront discovery and entry surfaces. Under
current truth, transactional continuity remains authenticated and tenant-scoped, while the
operator back-office stays simpler than B2B.

| Domain | Module | Description | Wave 4 | Status |
|--------|--------|-------------|--------|--------|
| **TA — Admin** | Store Profile | Brand, contact, plans | P1 | ⏳ Stub |
| | Membership | Staff access | P1 | ✅ API done |
| **TO — Operations** | Order List | Consumer orders overview | P1 | ⏳ Stub |
| | Returns | Handle consumer returns | P2 | ⏳ Not started |
| **TF — Finance** | Revenue Summary | Sales revenue (not fund movement) | P2 | ⏳ Not started |
| **TS — Sales/Products** | Product Catalog | Manage consumer-facing products | P1 | ⏳ Stub |
| | Promotions | Discount codes, sale prices | P2 | ⏳ Not started |
| **TC — Client Comms** | Customer Support | Consumer messages + tickets | P2 | ⏳ Not started |

---

## Role × Module Matrix (Cross-Cutting)

For each module, access is determined by the actor's role within the tenant:

| Role | TA — Admin | TO — Operations | TF — Finance | TS — Sales | TC — Comms |
|------|------------|-----------------|--------------|------------|------------|
| OWNER | Full | Full | Full | Full | Full |
| ADMIN | Full (no billing) | Full | Read + limited | Full | Full |
| MEMBER | Read only | Own tasks only | None | Catalog read | Assigned threads |

> Role resolution is downstream of membership RLS — `app.org_id` + `app.actor_id` context must be set for every tenant dashboard request. Doctrine v1.4 §2.

---

## Module Declaration Template (Required for Every New Module)

```markdown
## Module Declaration: [Module Name]

- **Domain:** TA | TO | TF | TS | TC
- **Covered surfaces:** ALL | B2B | AGGREGATOR | B2C (+ white-label overlay where applicable)
- **Actor roles:** OWNER | ADMIN | MEMBER (+ access level per role)
- **Realm:** tenant
- **Data authority:** [tables + RLS context required]
- **API endpoints:** [list or stub]
- **Audit events:** [SNAKE_CASE list]
- **Monetization touchpoint:** subscription value / transaction fee trigger / none
- **Anti-bazaar check:** [describe how this is structured/permissioned trade]
- **Doctrine v1.4 alignment:** org_id scoping? tenancy context? RLS role?
- **Wave target:** Wave 4 | Wave 5 | Backlog
- **Dependencies:** [other modules or APIs that must exist first]
```

---

## Priority Summary for Wave 4

| Priority | Covered Surface | Domain | Module |
|----------|-------------|--------|--------|
| P1 | ALL | TA | Org Profile / Store Profile |
| P1 | ALL | TA | Membership (UI completion for ADMIN invite flow) |
| P1 | ALL | TS | Catalog Management (UI completion — API exists) |
| P1 | ALL | TO | Order List (basic) |
| P1 | B2B/B2C + WL overlay | TA | Store Branding (UI for branding PUT — API exists) |
| P1 | B2B/B2C + WL overlay | TS | Collections (WL-specific) |
| P1 | B2B | TO | Compliance Tasks surface |
| P1 | B2B | TO | RFQ Management (product definition first) |
| P1 | ALL | TC | Notifications center |
| BUG | ALL | TO | Fix `POST /api/tenant/checkout` HTTP 500 before any commerce module |

---

*Document last updated: 2026-02-24*
*Next update trigger: Decision Backlog items D5/D6 resolved, or Wave 4 scope formally locked*
