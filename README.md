
> STATUS — RETAINED AS REFERENCE WITH TARGETED DE-AUTHORIZATION
>
> This top-level README is retained for repository orientation and historical context.
>
> It is no longer the active authority for:
> - product-truth definition
> - launch-readiness planning
> - execution sequencing or next-delivery prioritization
>
> Current replacement authority for those concerns is:
> - `docs/product-truth/TEXQTIC-GAP-REGISTER-v1.md`
> - `docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v1.md`
> - `docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v1.md`
>
> This banner is a de-authorization step only. The document body is preserved as reference.

> SUPERSESSION NOTE — BOARD-CANONICAL-MODEL-ADOPTION-001
>
> Current controlling platform identity is recorded in `docs/strategy/PLATFORM_DOCTRINE_ADDENDUM.md`.
> TexQtic is the operating system for trusted textile supply chains, expressed through three
> subordinate governed commercial access models: B2B Exchange, B2C Tenant-Branded Commerce, and
> Aggregator Directory Discovery + Intent Handoff. White-label is an overlay capability, not a
> fourth pillar. Enterprise is depth within B2B, not a separate platform mode. Any broader or
> older marketplace-first wording below is retained as historical orientation only.

TexQtic

TexQtic is a next-generation, multi-tenant governed platform for the global textile ecosystem. It
operates as the operating system for trusted textile supply chains and expresses that operating
system through three governed commercial access models: B2B Exchange, B2C Tenant-Branded
Commerce, and Aggregator Directory Discovery + Intent Handoff. White-label storefront capability
remains an overlay rather than a separate pillar.

This repository represents a clean rebuild of the TexQtic platform, intentionally started from scratch to eliminate architectural debt and enforce strong governance from day one.

🧭 Platform Vision

TexQtic is organized around three governed commercial access models subordinate to a single
platform spine:

Aggregator Directory Discovery + Intent Handoff

Curated discovery, qualification, and routing into downstream governed execution paths.

B2B Exchange

Structured manufacturer, trader, wholesaler, and business-participant commerce under platform
governance.

B2C Tenant-Branded Commerce

Tenant-branded public-safe discovery and entry surfaces with authenticated tenant-scoped
transactional continuity under current truth.

White-label remains an overlay capability on top of these governed access models rather than a
separate board-level pillar.

All experiences are subordinate expressions of a single governed platform spine with strict
multi-tenancy, security, and governance.

🏗️ Architectural Philosophy

This platform is built on a few non-negotiable principles:

1. Control Plane First

The platform is divided into planes:

Control Plane (Platform Governance)

Tenants

Admin users & RBAC

Feature flags

Audit logs (append-only)

AI budgets & governance

Impersonation & compliance

Tenant Plane (Business Domains – added later)

Catalog

Commerce

RFQs

Negotiations

Logistics, services, etc.

Business domains are intentionally excluded in early phases to prevent schema explosion.

2. Database-Enforced Multi-Tenancy

Every tenant-scoped table includes tenant_id

PostgreSQL Row Level Security (RLS) is mandatory

Application code never trusts client-supplied tenant context

Admin bypass is explicit, audited, and limited

3. Governance Over Convenience

TexQtic enforces strict governance to avoid the mistakes of legacy systems:

Controlled schema growth (table budgets)

Consistent naming conventions

Append-only audit logs

Clear domain ownership

Explicit architectural boundaries

This repo prioritizes long-term correctness over short-term speed.

🤝 Two-Team Development Model

TexQtic is developed using a dual-track workflow:

Team A — Platform & Data (Source of Truth)

Backend (Fastify / Node.js)

Database schema (Postgres + Prisma)

RLS policies

Authentication & authorization

Audit logging

Feature flags

AI governance

API contracts

Team A owns schema, migrations, security, and correctness.

Team B — UX & Scaffolding

UI/UX

Page layouts and shells

Onboarding flows

Control Plane dashboards

White-label storefronts

Team B never invents database tables or backend behavior.
All UI must conform to API contracts defined by Team A.

🧱 Tech Stack (Current)
Backend

Node.js + TypeScript

Fastify

PostgreSQL (Supabase)

Prisma (v7)

Zod (validation)

JWT (dual realms: tenant + admin)

bcrypt (password hashing)

Frontend

React

Vite

Tailwind CSS

Framer Motion

Infrastructure

Supabase (Postgres + Auth primitives)

Vercel (deployment)

Docker (local DB)

📁 Repository Structure (High Level)
/server
  /prisma          # Prisma schema, migrations, RLS
  /src
    /auth          # Tenant & admin auth
    /control       # Control Plane APIs
    /tenant        # Tenant-scoped APIs
    /db            # Prisma + tenant context helpers
    /middleware    # Auth, RLS context, guards
/shared
  /contracts       # API contracts, governance rules
/frontend
  /components      # UI components
  /layouts         # Experience shells
  /pages           # Auth, onboarding, control plane, storefronts

🔐 Security & Governance Rules (Summary)

These rules are mandatory:

Database tables & columns: snake_case

Prisma models: PascalCase, singular, mapped via @map / @@map

Code variables: camelCase

No secrets in client code

Audit logs are append-only

No cross-tenant reads without admin context

No business-domain tables without explicit approval

Violations are considered blocking issues, not refactors.

🚧 Project Status

This repository is under active foundational development.

Completed

Phase 1: Backend foundation & security scaffolding

Phase 2: Database schema, Prisma, RLS, seed data

In Progress

Phase 3: Authentication, sessions, impersonation enforcement

Planned

Phase 4: Control Plane full CRUD

Phase 5: Tenant onboarding → real persistence

Phase 6+: Business domains (catalog, commerce, RFQs)

⚠️ Important Note

This repository intentionally pauses and replaces the legacy TexQtic codebase.

The legacy repo is preserved separately for reference only.
All new development should happen here.

📜 License

Proprietary — © TexQtic
Internal use only unless explicitly approved.
