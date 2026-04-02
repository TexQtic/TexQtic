# TexQtic — Platform Doctrine Addendum: Positioning & Money

| Field     | Value                                                  |
|-----------|--------------------------------------------------------|
| **Date**  | 2026-02-24                                             |
| **Status**| DRAFT — Pending ratification by product leadership     |
| **Parent**| `docs/doctrine/doctrine_v1_4_part_*.md`                |
| **Links** | `docs/status/TEXQTIC_CURRENT_STATE__2026-02-24.md` §F, §G |

> This addendum extends Doctrine v1.4 with non-negotiable product positioning and monetization boundaries. Once ratified, these become binding constraints on all Wave 4+ module design decisions.

---

## 1. Non-Negotiables (Inviolable Constraints)

These can only be changed with an explicit ADR filed in `docs/doctrine/`.

| # | Constraint | Rationale |
|---|------------|-----------|
| N1 | TexQtic is **not** an open listing marketplace | Prevents commodity bazaar drift; structured/permissioned trade only |
| N2 | Every trade interaction must be audit-logged | Doctrine v1.4 compliance; governance is a product differentiator |
| N3 | Settlement is **not** a platform product in Phase 2 | "Not fintech now" — platform is system-of-record for workflow, not funds |
| N4 | AI decisions that are irreversible require maker-checker | AI Governance audit gap; explainability is a regulatory and trust requirement |
| N5 | Tenant isolation is constitutional — `app.org_id` is the boundary | RLS + Doctrine v1.4; cross-tenant data leakage is a zero-tolerance failure |

---

## 2. Platform Identity Statement

**TexQtic is a governed trade infrastructure layer for the textile supply chain.**

It delivers value as a workflow + compliance + authority system, not as a content/listing platform. The platform is:

- **Permissioned** — actors are vetted; participation is granted, not open
- **Structured** — every trade follows defined workflow states (RFQ → negotiation → compliance → fulfillment)
- **Governed** — every state transition produces an audit artifact
- **Verticalized** — textile supply chain (yarn → fabric → garment → retail) is the bounded domain

### Anti-Bazaar Test (apply to every new feature)

> "Does this feature enable *structured, permissioned, auditable trade*, or does it enable *open listing and undifferentiated discovery*?"

If the answer is "open listing → reject or redesign."

### Board Canonical Model Adoption (2026-04-02)

The following board-approved model now controls subsequent planning, repo realignment,
governance normalization, and doctrine normalization unless a later board-level artifact
supersedes it explicitly.

**TexQtic is the operating system for trusted textile supply chains.**

It is a governed infrastructure layer that enables verified participants to discover
counterparties, conduct commerce, and move through auditable workflow with controlled
permissions, tenant-scoped continuity, compliance-aware operations, and evidence-ready trade
execution.

TexQtic expresses this operating system through three governed commercial access models:

1. **B2B Exchange**
	The primary governed trade and commerce mode for authenticated business participants,
	covering structured discovery, commercial engagement, transaction continuity, and downstream
	workflow.
2. **B2C Tenant-Branded Commerce**
	A tenant-branded consumer commerce mode that may expose public-safe discovery and entry
	surfaces, while transactional continuity such as identity, cart persistence, checkout,
	orders, and governed post-purchase operations remains authenticated and tenant-scoped unless
	later expanded by explicit board authorization.
3. **Aggregator Directory Discovery + Intent Handoff**
	A curated discovery, qualification, and intent-routing mode that helps participants find
	relevant counterparties and routes qualified demand into downstream governed execution paths.
	It is not the primary owner of downstream transaction execution, settlement, or workflow
	orchestration.

Structural clarifiers:

- The operating-system layer is primary.
- The three commercial access models are subordinate expressions of that operating-system layer.
- White-label is an overlay capability and deployment/experience model, not a fourth board-level pillar.
- Enterprise is a depth posture within B2B operating reality, not a separate platform mode.
- Control-plane, superadmin, and WL-admin surfaces are governance/operations surfaces, not commercial pillars.

Non-drift guardrails:

- TexQtic is not an open bazaar-style marketplace.
- TexQtic is not marketplace-first in identity.
- TexQtic is not infrastructure-only in expression.
- B2C must not be described as a fully anonymous public retail model under current truth.
- Aggregator must not be described as a full transaction-owning marketplace orchestrator under current truth.
- White-label must not be elevated into a fourth canonical pillar.

Supersession note:

- Earlier shorthand such as "three-sided platform", "hybrid B2B + white-label SaaS", or broad
  marketplace wording remains historical unless it conforms to the canonical model above.
- This adoption records platform-layer-first identity with three subordinate governed commercial
  access models as the controlling definition.

---

## 3. Delivery Model

| Mode                    | Description                                                                            |
|-------------------------|----------------------------------------------------------------------------------------|
| **B2B Governed Exchange** | Multi-party supply chain participants operating under platform governance rules        |
| **White-Label SaaS**    | Brand-owned storefronts and back-offices running on TexQtic infrastructure             |
| **Platform API**        | Headless API access for advanced integrations (future; governed by rate-limit + subscription tier) |

---

## 4. Monetization Model

### 4.1 Principles

1. Revenue is tied to **value delivered**, not volume of listings
2. Subscriptions provide predictable baseline; transaction fees align incentives
3. No race-to-zero take-rate; platform earns when it creates measurable trade value

### 4.2 Revenue Streams

| Stream                  | Trigger                                                           | Notes                                  |
|-------------------------|-------------------------------------------------------------------|----------------------------------------|
| **Subscription**        | Tenant operating the platform (dashboards, workflows, compliance, integrations) | Priced per tenant tier (FREE/PROFESSIONAL/ENTERPRISE) |
| **Transaction fee**     | Matched RFQ, verified fulfillment, governed settlement visibility | Only activates when platform creates quantifiable trade value |
| **Compliance add-ons**  | Audit trail export, compliance certificate generation, regulatory reporting | Future; requires compliance module maturity |
| **AI add-ons**          | Advanced AI matching, risk scoring, negotiation intelligence      | Future; advisory-tier model            |

### 4.3 Pricing Tiers (Indicative — to be formally defined)

| Tier           | Audience                                 | Core Entitlements                                           |
|----------------|------------------------------------------|-------------------------------------------------------------|
| FREE           | Trial / small operators                  | Basic catalog, limited orders, no compliance modules        |
| PROFESSIONAL   | Mid-size B2B operators                   | Full workflow, RFQ/negotiation, compliance lite, audit log  |
| ENTERPRISE     | Large operators + White-label brands     | Full platform, API access, custom compliance, priority SLA  |

---

## 5. Settlement Boundaries

### 5.1 Current Phase (Phase 2 — "Not Fintech Now")

| Scope                 | Decision                                                                        |
|-----------------------|---------------------------------------------------------------------------------|
| Settlement mechanism  | **Direct tenant-to-tenant** — platform is workflow system-of-record only       |
| Funds custody         | **Platform never holds funds** — zero exposure to money transmission regulation |
| Platform role         | Issues orders, tracks fulfillment state, records payment acknowledgement — does NOT move money |
| PSP/bank integration  | Architecture hookpoints designed but **not activated**                          |

### 5.2 Future Phases (Post Governance Maturity)

| Phase | Capability | Gate |
|-------|------------|------|
| Phase 3 | Bank/PSP partnership for payment status polling | Compliance module mature + regulatory review |
| Phase 4 | Milestone escrow for high-value contracts | Licensed partner + formal fintech governance |
| Phase 5 | Platform-managed settlement | Regulatory license or white-label fintech agreement |

> **Hard rule:** No settlement code ships until Phase 3 gate is passed and documented.

---

## 6. AI Governance Stance

### 6.1 Current Stance: Advisory Only

All AI features in Wave 4 and Wave 5 are advisory — they surface signals to human actors but do not take autonomous actions.

| Permitted (Advisory)                        | Forbidden (Autonomous)                          |
|---------------------------------------------|-------------------------------------------------|
| Matching suggestions (buyer-supplier)       | Auto-accepting/rejecting RFQs                   |
| Risk surface signals on counterparties      | Auto-approving compliance documents             |
| Negotiation pace / anchor price guidance    | Auto-routing orders without human confirmation  |
| Compliance gap identification               | Auto-flagging or suspending tenants             |

### 6.2 Gated Automation (Future — requires explicit unlocking)

Before any AI decision becomes automated:

1. **Policy artifact** must exist (filed in `docs/doctrine/` or linked ADR)
2. **Auditable reasoning** must be persisted (not just the decision, but the inputs + model version + confidence)
3. **Maker-checker** must be implemented for any irreversible action
4. **Explainability report** must be producible on demand (regulatory audit readiness)

Reference baseline: `docs/DOCTRINE_V1_4_MAPPING_AUDIT.md`

---

## 7. Ratification Record

| Version | Date | Decision | Approved By |
|---------|------|----------|-------------|
| DRAFT   | 2026-02-24 | Initial draft from strategic alignment session | — |
| —       | —    | —        | —           |

*Ratification requires explicit sign-off from product leadership. Until ratified, this doc is advisory only.*
