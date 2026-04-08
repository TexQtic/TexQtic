import React from 'react';
import type { RuntimeLocalRouteKey, RuntimeShellNavigationSurface } from '../runtime/sessionRuntimeDescriptor';

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
  navigation: RuntimeShellNavigationSurface | null;
  onNavigateRoute: (_routeKey: RuntimeLocalRouteKey) => void;
}

const hasNavigationRoute = (navigation: RuntimeShellNavigationSurface | null, routeKey: RuntimeLocalRouteKey) => {
  return navigation?.items.some(item => item.routeKey === routeKey) ?? false;
};

const isActiveNavigationRoute = (navigation: RuntimeShellNavigationSurface | null, routeKey: RuntimeLocalRouteKey) => {
  return navigation?.items.some(item => item.routeKey === routeKey && item.active) ?? false;
};

const CONTROL_PLANE_NAV = [
  { routeKey: 'tenant_registry', icon: '🏢', label: 'Tenants' },
  { routeKey: 'flags', icon: '🚩', label: 'Feature Flags' },
  { routeKey: 'finance', icon: '💰', label: 'Finance & Fees' },
  { routeKey: 'trades', icon: '🔁', label: 'Trade Oversight' },
  { routeKey: 'cart_summaries', icon: '🛒', label: 'Cart Summaries' },
  { routeKey: 'escrow_admin', icon: '🔒', label: 'Escrow Accounts' },
  { routeKey: 'settlement_admin', icon: '💸', label: 'Settlement Admin' },
  { routeKey: 'compliance', icon: '✅', label: 'Compliance Queue' },
  { routeKey: 'cases', icon: '⚠️', label: 'Disputes' },
  { routeKey: 'escalations', icon: '🚨', label: 'Escalations' },
  { routeKey: 'certifications', icon: '📋', label: 'Cert Lifecycle' },
  { routeKey: 'traceability', icon: '🔗', label: 'Traceability' },
  { routeKey: 'maker_checker', icon: '✍️', label: 'Maker-Checker' },
  { routeKey: 'ai', icon: '🤖', label: 'AI Governance' },
  { routeKey: 'events', icon: '⚡', label: 'Live Event Stream' },
  { routeKey: 'logs', icon: '📜', label: 'Audit Logs' },
  { routeKey: 'rbac', icon: '⚙️', label: 'Access Control' },
  { routeKey: 'health', icon: '❤️', label: 'Health Status' },
] as const;

export const SuperAdminShell: React.FC<SuperAdminShellProps> = ({
  children,
  authRealm,
  actorIdentity,
  navigation,
  onNavigateRoute,
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
          {CONTROL_PLANE_NAV.slice(0, 7).map(item => {
            if (!hasNavigationRoute(navigation, item.routeKey)) {
              return null;
            }

            return (
              <NavLink
                key={item.routeKey}
                active={isActiveNavigationRoute(navigation, item.routeKey)}
                onClick={() => onNavigateRoute(item.routeKey)}
                icon={item.icon}
                label={item.label}
              />
            );
          })}

          <SectionTitle>Risk & Compliance</SectionTitle>
          {CONTROL_PLANE_NAV.slice(7, 14).map(item => {
            if (!hasNavigationRoute(navigation, item.routeKey)) {
              return null;
            }

            return (
              <NavLink
                key={item.routeKey}
                active={isActiveNavigationRoute(navigation, item.routeKey)}
                onClick={() => onNavigateRoute(item.routeKey)}
                icon={item.icon}
                label={item.label}
              />
            );
          })}

          <SectionTitle>Infrastructure</SectionTitle>
          {CONTROL_PLANE_NAV.slice(14).map(item => {
            if (!hasNavigationRoute(navigation, item.routeKey)) {
              return null;
            }

            return (
              <NavLink
                key={item.routeKey}
                active={isActiveNavigationRoute(navigation, item.routeKey)}
                onClick={() => onNavigateRoute(item.routeKey)}
                icon={item.icon}
                label={item.label}
              />
            );
          })}
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
