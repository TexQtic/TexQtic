# TexQtic Doctrine Addendum
## Positioning · Monetization · Settlement · AI Boundaries

| Field         | Value                                                           |
|---------------|-----------------------------------------------------------------|
| **Status**    | DRAFT — Requires Product Ratification                          |
| **Date**      | 2026-02-24                                                      |
| **Parent**    | Doctrine v1.4                                                   |
| **Scope**     | Strategic binding constraints for Wave 4+                       |
| **Ratified**  | ☐ Pending                                                       |

> **Anti-drift rule:** No Wave 4 module may ship until this Addendum is signed off, the settlement scope decision is recorded, and the AI stance is ratified. Non-negotiables below can only be changed with an explicit ADR filed in `docs/doctrine/`.

---

## I. Platform Identity (Non-Negotiable)

**TexQtic IS:**

> A governed trade infrastructure layer for the textile supply chain.

**TexQtic is NOT:**

- ❌ An open listing marketplace
- ❌ A commodity bazaar
- ❌ A pure payment processor
- ❌ A social commerce platform

---

## II. Core Identity Pillars

### 1️⃣ Structured Trade

All commercial interactions must follow defined state transitions:

```
RFQ → Negotiation → Compliance Gate → Order → Fulfillment → Settlement Acknowledgment
```

**No "direct free listing → checkout" bypass is permitted.**

Any feature that allows a transaction to skip a governance gate is rejected by default and requires an explicit ADR to override.

### 2️⃣ Permissioned Participation

- Actors must be attached to orgs (tenants)
- Roles must be explicit (`OWNER` / `ADMIN` / `MEMBER` / `BUYER` / `GUEST`)
- All actions must be RLS-scoped via `app.org_id`
- No anonymous write operations on trade entities

### 3️⃣ Governance First

Every irreversible event must:

1. Emit an audit log entry (SNAKE_CASE event name, actor ID, org ID, timestamp)
2. Be attributable to a specific actor + role
3. Respect role authority (no privilege escalation at application layer)

---

## III. Monetization Doctrine

**Model: Hybrid — subscription baseline + trade-value transaction fee**

| Revenue Stream         | Trigger                                            | Rationale                           |
|------------------------|----------------------------------------------------|-------------------------------------|
| **Subscription**       | Platform operating system usage (dashboards, workflows, compliance, integrations) | Predictable baseline revenue |
| **Transaction Fee**    | Platform-created trade value (matched RFQ, verified fulfillment, settlement visibility) | Incentive alignment — earn when we add value |
| **AI Add-ons** (future) | Advanced advisory modules (matching intelligence, risk scoring, negotiation insights) | Premium tier value |
| **Compliance Add-ons** (future) | Audit export, regulatory certificates, reporting | Governance premium |

### Anti-Bazaar Rule

> "If a feature only increases listing volume without structured, permissioned, auditable trade — **reject it**."

Apply this test to every new feature request before scoping begins.

### Subscription Tiers (Indicative)

| Tier           | Target                          | Core Access                                              |
|----------------|---------------------------------|----------------------------------------------------------|
| FREE           | Trial / small operators         | Basic catalog, limited orders, no compliance modules     |
| PROFESSIONAL   | Mid-size B2B operators          | Full workflow, RFQ/negotiation, compliance lite, audit log |
| ENTERPRISE     | Large operators + WL brands     | Full platform, API, custom compliance, SLA               |

---

## IV. Settlement Doctrine (Phase-Scoped)

### Phase 2 — Current ("Not Fintech Now")

| Constraint              | Rule                                                                                |
|-------------------------|-------------------------------------------------------------------------------------|
| Settlement mechanism    | **Direct tenant-to-tenant only**                                                    |
| Fund custody            | **Platform NEVER holds funds** — zero money transmission exposure                   |
| Platform role           | Records settlement status events; does NOT move money                               |
| PSP / bank integration  | Architecture hookpoints exist but are **NOT activated**                             |

### Phase 3 — Future (Bank/PSP Integration)

- Status polling only via bank/PSP partnership
- Gate: compliance module mature + explicit regulatory review completed

### Phase 4+ — Future (Managed Settlement)

- Optional milestone escrow for high-value contracts
- Gate: licensed fintech partner + formal governance framework

> **Hard rule:** No settlement code ships past hookpoints until the Phase 3 gate is formally passed and documented in `docs/doctrine/`.

---

## V. AI Governance Boundaries

### Current Stance: Advisory Only

**Permitted (Advisory):**
- Match suggestions (buyer ↔ supplier)
- Risk scoring on counterparties
- Negotiation pace / anchor price insights
- Compliance gap identification

**Forbidden (Autonomous — current phase):**
- Auto-accepting or auto-rejecting RFQs
- Auto-approving compliance documents
- Auto-routing orders without human confirmation
- Auto-suspending or auto-flagging tenants

### Gated Automation — Future Unlock Conditions

Before any AI capability may execute an irreversible action, **all four** of the following must be in place:

| # | Condition | Artifact Required |
|---|-----------|-------------------|
| 1 | **Policy artifact** recorded | Filed in `docs/doctrine/` or linked ADR |
| 2 | **Reasoning artifact** persisted | Inputs + model version + confidence score stored, not just the decision |
| 3 | **Maker-Checker** enforced | No irreversible AI action without human confirmation gate |
| 4 | **Explainability** retrievable | On-demand audit report producible for regulatory review |

Reference: `docs/DOCTRINE_V1_4_MAPPING_AUDIT.md`

---

## VI. White-Label Tenant Definition

**White-Label tenants are:**

> Brand operators running a storefront + back-office on TexQtic infrastructure.

**They must have:**

1. **Storefront** — consumer-facing product browsing, cart, checkout, orders
2. **Store Admin Back-Office** — operator-facing product management, order handling, branding, staff

**They are NOT:**

- ❌ Independent multi-vendor marketplaces
- ❌ Multi-seller ecosystems with open seller onboarding

> **Product decision (locked):** WL tenants receive a Store Admin panel in Wave 4 (P1). The storefront consumer-facing UX is a separate rendering surface and is out of scope for the tenant dashboard matrix.

---

## VII. Ratification Block

**No Wave 4 module may ship until:**

- [ ] This Addendum is signed off by product leadership
- [ ] Settlement scope decision (Phase 2 boundary) is formally recorded
- [ ] AI advisory stance is ratified
- [ ] WL Store Admin scope (VI above) is confirmed as Wave 4 P1

### Ratification Record

| Version | Date       | Decision         | Approved By |
|---------|------------|------------------|-------------|
| DRAFT   | 2026-02-24 | Initial draft    | —           |

---

*Cross-references: `docs/strategy/PLATFORM_DOCTRINE_ADDENDUM.md` · `docs/status/TEXQTIC_CURRENT_STATE__2026-02-24.md` · `docs/doctrine/doctrine_v1_4_part_*.md`*
