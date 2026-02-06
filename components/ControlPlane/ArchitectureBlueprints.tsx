
import React from 'react';

export const ArchitectureBlueprints: React.FC = () => {
  const sections = [
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
        <h1 className="text-2xl font-bold text-white">Platform Blueprints</h1>
        <p className="text-slate-400 text-sm">Formal architectural specifications and strategic roadmap.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {sections.map((sec, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
            <h2 className="text-rose-500 font-bold uppercase tracking-[0.2em] text-xs">{sec.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
              {sec.content.map((item, j) => (
                <div key={j} className="flex flex-col gap-1">
                  <span className="text-slate-500 text-[10px] font-bold uppercase">{item.key}</span>
                  <span className="text-slate-200 text-sm leading-relaxed">{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
