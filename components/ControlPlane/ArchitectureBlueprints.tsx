
import React from 'react';

export const ArchitectureBlueprints: React.FC = () => {
  const archivedSections = [
    {
      title: "Recommended Tech Stack",
      content: [
        { key: "Auth Orchestrator", val: "Clerk or Auth0 - Native Multi-tenant Organization support with MFA and SSO." },
        { key: "Session Strategy", val: "HttpOnly Secure Cookies + JWT for Edge-side tenant context validation." },
        { key: "Frontend", val: "React 19, Tailwind CSS, Shadcn/UI (Theming via CSS Variables for White-Labeling)" },
        { key: "Backend", val: "Node.js (NestJS) or Go - Modular Monolith with DDD boundaries" },
        { key: "Data Isolation", val: "PostgreSQL (Multi-tenant RLS), ensuring strictly filtered data access by tenant_id." },
        { key: "Messaging", val: "Redis Pub/Sub (Internal) -> Migrating to Kafka/RabbitMQ for high throughput." }
      ]
    },
    {
      title: "Auth Realms & RBAC",
      content: [
        { key: "Platform Realm", val: "Staff-only access to Control Plane via dedicated staff_id verification." },
        { key: "Tenant Realm", val: "Standard user access isolated by tenant_id/org_id." },
        { key: "Impersonation", val: "Time-limited (1h), logged, and bannered sessions for platform support staff." }
      ]
    },
    {
      title: "Onboarding Lifecycle",
      content: [
        { key: "Tenant Creation", val: "Transactional creation of Tenant, Org, and first Admin Membership." },
        { key: "KYB/Verification", val: "Pending status for new tenants until Trust & Safety staff review." },
        { key: "Experience Selection", val: "Configuration-driven routing to specific UI shells (B2B, B2C, etc)." }
      ]
    }
  ];

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-white">Preserved Blueprint Placeholder</h1>
        <p className="text-slate-400 text-sm">
          Retained historical shell only. This panel is not current architecture or roadmap
          authority.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-100">
        <p className="font-semibold uppercase tracking-widest text-[11px] text-amber-300">
          Non-Authoritative Surface
        </p>
        <p className="mt-2 text-amber-50/90">
          The sections below are preserved placeholder guidance kept for traceability only. They do
          not define current stack choices, identity architecture, tenancy terminology, or active
          platform roadmap direction.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {archivedSections.map((sec, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
            <h2 className="text-rose-500 font-bold uppercase tracking-[0.2em] text-xs">
              Archived Placeholder: {sec.title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
              {sec.content.map((item, j) => (
                <div key={j} className="flex flex-col gap-1">
                  <span className="text-slate-500 text-[10px] font-bold uppercase">{item.key}</span>
                  <span className="text-slate-300 text-sm leading-relaxed">
                    Placeholder example: {item.val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
