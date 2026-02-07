# TexQtic: Multi-Tenant Architecture Scaffold

This scaffold demonstrates a clean, scalable, production-grade architecture for a three-sided global platform.

## 🏗️ Tech Stack Choice & Rationale

1.  **Frontend: React 18 + TypeScript + Tailwind CSS**
    - _Why:_ Industry standard for performance and developer velocity. Tailwind allows for the configuration-based white-labeling required without separate CSS bundles.
2.  **Architecture: Monorepo (Conceptual)**
    - _Structure:_
      - `/apps/shell`: The platform orchestrator.
      - `/packages/ui`: Shared design system.
      - `/packages/domains`: Core business logic (Identity, Catalog, Commerce).
      - `/packages/events`: Shared event schemas.
3.  **Backend: Modular Monolith → Microservices**
    - _Path:_ Start with a modular monolith using Domain-Driven Design (DDD). As traffic scales, extract Domains (e.g., Catalog, Logistics) into independent services.
4.  **Data Isolation: PostgreSQL with RLS**
    - _Mechanism:_ Use Row Level Security (RLS) policies where every table has a `tenant_id`. The application context sets the `app.current_tenant` session variable on every query.
5.  **Intelligence: Gemini API Integration**
    - _Utility:_ Built-in AI hooks for market analysis, negotiation strategy, and catalog enrichment.

## 📁 Domain Boundaries

- **Identity & Org:** Manages Users, Tenants, Teams, and RBAC.
- **Catalog:** Central repository of products with tenant-specific overrides (price, visibility).
- **Commerce:** Negotiation workflows, Orders, RFQs, Checkout.
- **Events:** Event-bus emitting actions like `ORDER_PLACED`, `SUPPLIER_VERIFIED`.

## 🚀 Scalability Notes

- **Tenant Resolution:** Performed at the Edge (Cloudfront/Cloudflare) using the Host header.
- **White-Labeling:** Purely data-driven. A tenant's configuration (theme, logo, enabled features) is fetched on hydration.
- **AI Readiness:** All platform events are streamed to a data lake, allowing future LLM fine-tuning or RAG implementations for industry-specific insights.
