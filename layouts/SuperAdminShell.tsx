import React from 'react';

export type ControlPlaneIdentity = {
  id: string | null;
  email: string | null;
  role: string | null;
};

const formatControlPlaneRole = (role: string | null) => {
  if (!role) {
    return null;
  }

  return role
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0) + part.slice(1).toLowerCase())
    .join('');
};

export const formatControlPlaneActorLabel = (identity: ControlPlaneIdentity | null) => {
  if (!identity) {
    return 'Authenticated user';
  }

  const principal = identity.email ?? identity.id ?? 'Authenticated user';
  const roleLabel = formatControlPlaneRole(identity.role);

  return roleLabel ? `${principal} (${roleLabel})` : principal;
};

export type AdminView =
  | 'TENANTS'
  | 'FLAGS'
  | 'FINANCE'
  | 'COMPLIANCE'
  | 'CASES'
  | 'ESCALATIONS'
  /** TECS-FBW-005: G-019 certification lifecycle admin view (D-022-C: read-only) */
  | 'CERTIFICATIONS'
  /** TECS-FBW-015: G-016 traceability cross-tenant inspection (Phase A: read-only) */
  | 'TRACEABILITY'
  | 'TRADES'
  /** TECS-FBW-007: marketplace_cart_summaries projection admin panel (read-only) */
  | 'CART_SUMMARIES'
  /** PW5-W2: G-018 cross-tenant escrow account read panel (D-020-B: no balance) */
  | 'ESCROW_ADMIN'
  /** PW5-W3-FE: Settlement admin read panel — backend route implemented in 14aea49 */
  | 'SETTLEMENT_ADMIN'
  /** PW5-W4: G-021 maker-checker approval queue console (read-only) */
  | 'MAKER_CHECKER'
  | 'AI'
  | 'LOGS'
  | 'HEALTH'
  | 'RBAC'
  | 'EVENTS';

interface SuperAdminShellProps {
  children: React.ReactNode;
  authRealm: 'TENANT' | 'CONTROL_PLANE';
  actorIdentity: ControlPlaneIdentity | null;
  activeView: AdminView;
  onViewChange: (_view: AdminView) => void;
}

export const SuperAdminShell: React.FC<SuperAdminShellProps> = ({
  children,
  authRealm,
  actorIdentity,
  activeView,
  onViewChange,
}) => {
  if (authRealm !== 'CONTROL_PLANE') {
    return null;
  }

  return (
  <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans">
    <header className="h-14 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex items-center px-6 justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <div className="bg-rose-600 text-white font-black px-2 py-0.5 rounded text-xs tracking-tighter uppercase">
          Control Plane
        </div>
        <div className="h-4 w-px bg-slate-700"></div>
        <div className="font-bold text-slate-100 flex items-center gap-2">
          <span>🛡️</span> TexQtic
        </div>
      </div>
      <div className="flex items-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Platform: Operational
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded">
          {formatControlPlaneActorLabel(actorIdentity)}
        </div>
      </div>
    </header>
    <div className="flex flex-1">
      <aside className="w-64 border-r border-slate-800 bg-slate-900/30 hidden md:flex flex-col p-4 sticky top-14 h-[calc(100vh-3.5rem)]">
        <nav className="space-y-0.5 overflow-y-auto pr-2 custom-scrollbar">
          <SectionTitle>Governance</SectionTitle>
          <NavLink
            active={activeView === 'TENANTS'}
            onClick={() => onViewChange('TENANTS')}
            icon="🏢"
            label="Tenants"
          />
          <NavLink
            active={activeView === 'FLAGS'}
            onClick={() => onViewChange('FLAGS')}
            icon="🚩"
            label="Feature Flags"
          />
          <NavLink
            active={activeView === 'FINANCE'}
            onClick={() => onViewChange('FINANCE')}
            icon="💰"
            label="Finance & Fees"
          />

          <NavLink
            active={activeView === 'TRADES'}
            onClick={() => onViewChange('TRADES')}
            icon="🔁"
            label="Trade Oversight"
          />
          {/* TECS-FBW-007: marketplace_cart_summaries projection (read-only admin panel) */}
          <NavLink
            active={activeView === 'CART_SUMMARIES'}
            onClick={() => onViewChange('CART_SUMMARIES')}
            icon="🛒"
            label="Cart Summaries"
          />
          {/* PW5-W2: G-018 cross-tenant escrow read panel (D-020-B: no balance) */}
          <NavLink
            active={activeView === 'ESCROW_ADMIN'}
            onClick={() => onViewChange('ESCROW_ADMIN')}
            icon="🔒"
            label="Escrow Accounts"
          />
          {/* PW5-W3-FE: Settlement admin read panel (backend: 14aea49) */}
          <NavLink
            active={activeView === 'SETTLEMENT_ADMIN'}
            onClick={() => onViewChange('SETTLEMENT_ADMIN')}
            icon="💸"
            label="Settlement Admin"
          />

          <SectionTitle>Risk & Compliance</SectionTitle>
          <NavLink
            active={activeView === 'COMPLIANCE'}
            onClick={() => onViewChange('COMPLIANCE')}
            icon="✅"
            label="Compliance Queue"
          />
          <NavLink
            active={activeView === 'CASES'}
            onClick={() => onViewChange('CASES')}
            icon="⚠️"
            label="Disputes"
          />
          <NavLink
            active={activeView === 'ESCALATIONS'}
            onClick={() => onViewChange('ESCALATIONS')}
            icon="🚨"
            label="Escalations"
          />
          {/* TECS-FBW-005: G-019 certification lifecycle admin surface (D-022-C: read-only) */}
          <NavLink
            active={activeView === 'CERTIFICATIONS'}
            onClick={() => onViewChange('CERTIFICATIONS')}
            icon="📋"
            label="Cert Lifecycle"
          />
          {/* TECS-FBW-015: G-016 traceability cross-tenant inspection (Phase A: read-only) */}
          <NavLink
            active={activeView === 'TRACEABILITY'}
            onClick={() => onViewChange('TRACEABILITY')}
            icon="🔗"
            label="Traceability"
          />
          {/* PW5-W4: G-021 maker-checker approval queue console (read-only) */}
          <NavLink
            active={activeView === 'MAKER_CHECKER'}
            onClick={() => onViewChange('MAKER_CHECKER')}
            icon="✍️"
            label="Maker-Checker"
          />
          <NavLink
            active={activeView === 'AI'}
            onClick={() => onViewChange('AI')}
            icon="🤖"
            label="AI Governance"
          />

          <SectionTitle>Infrastructure</SectionTitle>
          <NavLink
            active={activeView === 'EVENTS'}
            onClick={() => onViewChange('EVENTS')}
            icon="⚡"
            label="Live Event Stream"
          />
          <NavLink
            active={activeView === 'LOGS'}
            onClick={() => onViewChange('LOGS')}
            icon="📜"
            label="Audit Logs"
          />
          <NavLink
            active={activeView === 'RBAC'}
            onClick={() => onViewChange('RBAC')}
            icon="⚙️"
            label="Access Control"
          />
          <NavLink
            active={activeView === 'HEALTH'}
            onClick={() => onViewChange('HEALTH')}
            icon="❤️"
            label="Health Status"
          />
        </nav>
      </aside>
      <main className="flex-1 p-8 bg-[#020617] overflow-y-auto">{children}</main>
    </div>
  </div>
  );
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest py-3 px-3">
    {children}
  </div>
);

const NavLink = ({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all text-left ${active ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
  >
    <span className="grayscale opacity-50">{icon}</span>
    <span>{label}</span>
  </button>
);
