
TexQtic

TexQtic is a next-generation, multi-tenant platform for the global textile ecosystem — connecting manufacturers, traders, service providers, brands, and retailers across B2B, B2C, and Aggregator experiences, with full white-label storefront support.

This repository represents a clean rebuild of the TexQtic platform, intentionally started from scratch to eliminate architectural debt and enforce strong governance from day one.

🧭 Platform Vision

TexQtic is designed as a three-sided platform:

Aggregator / Directory

Discovery of manufacturers, traders, service providers, consultants, logistics, compliance agencies, etc.

B2B Marketplace

Manufacturer ↔ wholesaler commerce

RFQs, negotiations, contracts, bulk pricing

B2C / D2C Marketplace

Retail storefronts for brands and sellers

Optional white-label, Shopify-like experience

All experiences are powered by a single platform spine with strict multi-tenancy, security, and governance.

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
