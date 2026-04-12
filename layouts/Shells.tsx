
import React from 'react';
import { TenantConfig } from '../types';
import { useCart } from '../contexts/CartContext';
import type { RuntimeLocalRouteKey, RuntimeShellNavigationSurface } from '../runtime/sessionRuntimeDescriptor';

interface TenantShellNavigationContract {
  surface: RuntimeShellNavigationSurface | null;
  onNavigateRoute: (routeKey: RuntimeLocalRouteKey) => void;
  onNavigateTeam?: () => void;
  showAuthenticatedAffordances?: boolean;
  b2cSearchValue?: string;
  onB2CSearchChange?: (value: string) => void;
}

interface ShellProps {
  tenant: TenantConfig;
  children: React.ReactNode;
  navigation: TenantShellNavigationContract;
}

interface B2BShellProps extends ShellProps {
  shellMode?: 'default' | 'verification-blocked';
  shellLabel?: string;
  shellHeaderTitle?: string;
  shellFooterLabel?: string;
  shellStatusLabel?: string | null;
}

const hasShellRoute = (surface: RuntimeShellNavigationSurface | null, routeKey: RuntimeLocalRouteKey) => {
  return surface?.items.some(item => item.routeKey === routeKey) ?? false;
};

const isRemoteLogoAsset = (logo: string) => /^https?:\/\//i.test(logo);

const TenantMark: React.FC<{ tenant: TenantConfig; sizeClassName?: string }> = ({
  tenant,
  sizeClassName = 'h-9 w-9',
}) => {
  if (isRemoteLogoAsset(tenant.theme.logo)) {
    return (
      <img
        src={tenant.theme.logo}
        alt={`${tenant.name} logo`}
        className={`${sizeClassName} rounded-xl object-cover shadow-sm`}
      />
    );
  }

  return (
    <span aria-hidden="true" className="text-xl leading-none">
      {tenant.theme.logo}
    </span>
  );
};

const PlatformSignature: React.FC<{ label: string; tone?: 'light' | 'dark' }> = ({
  label,
  tone = 'light',
}) => {
  const className = tone === 'dark'
    ? 'inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-300'
    : 'inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500';
  const brandClassName = tone === 'dark' ? 'text-white' : 'text-slate-700';

  return (
    <div className={className}>
      <span className={brandClassName}>TexQtic</span>
      <span>{label}</span>
    </div>
  );
};

export const AggregatorShell: React.FC<ShellProps> = ({ tenant, children, navigation }) => (
  <div className="min-h-screen flex flex-col font-sans">
    <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center gap-6">
        <div className="flex items-center gap-4 min-w-0">
          <button type="button" className="flex items-center gap-3 text-xl font-bold cursor-pointer min-w-0" onClick={() => navigation.onNavigateRoute('home')}>
            <TenantMark tenant={tenant} />
            <span className="truncate">{tenant.name}</span>
          </button>
          <PlatformSignature label="Aggregator Workspace" tone="dark" />
        </div>
        <nav className="hidden md:flex gap-6 text-sm font-medium">
          <button onClick={() => navigation.onNavigateRoute('home')} className="text-blue-400">Companies</button>
          {hasShellRoute(navigation.surface, 'certifications') && <button onClick={() => navigation.onNavigateRoute('certifications')} className="hover:text-blue-400 transition text-slate-300">Certifications</button>}
          {hasShellRoute(navigation.surface, 'traceability') && <button onClick={() => navigation.onNavigateRoute('traceability')} className="hover:text-blue-400 transition text-slate-300">Traceability</button>}
          {hasShellRoute(navigation.surface, 'orders') && <button onClick={() => navigation.onNavigateRoute('orders')} className="hover:text-blue-400 transition text-slate-300">Orders</button>}
          {hasShellRoute(navigation.surface, 'dpp') && <button onClick={() => navigation.onNavigateRoute('dpp')} className="hover:text-blue-400 transition text-slate-300">DPP Passport</button>}
          {hasShellRoute(navigation.surface, 'escrow') && <button onClick={() => navigation.onNavigateRoute('escrow')} className="hover:text-blue-400 transition text-slate-300">Escrow</button>}
          {hasShellRoute(navigation.surface, 'escalations') && <button onClick={() => navigation.onNavigateRoute('escalations')} className="hover:text-blue-400 transition text-slate-300">Escalations</button>}
          {hasShellRoute(navigation.surface, 'settlement') && <button onClick={() => navigation.onNavigateRoute('settlement')} className="hover:text-blue-400 transition text-slate-300">Settlement</button>}
          {hasShellRoute(navigation.surface, 'audit_logs') && <button onClick={() => navigation.onNavigateRoute('audit_logs')} className="hover:text-blue-400 transition text-slate-300">Audit Log</button>}
          {hasShellRoute(navigation.surface, 'trades') && <button onClick={() => navigation.onNavigateRoute('trades')} className="hover:text-blue-400 transition text-slate-300">Trades</button>}
          <button onClick={navigation.onNavigateTeam} className="hover:text-blue-400 transition text-slate-300">Team</button>
        </nav>
      </div>
    </header>
    <main className="flex-1 bg-slate-50 relative">{children}</main>
  </div>
);

export const B2BShell: React.FC<B2BShellProps> = ({
  tenant,
  children,
  navigation,
  shellMode = 'default',
  shellLabel = 'B2B Workspace',
  shellHeaderTitle = 'TexQtic B2B Workspace',
  shellFooterLabel = 'v2.4.0 • TexQtic B2B Workspace',
  shellStatusLabel = null,
}) => {
  const isVerificationBlocked = shellMode === 'verification-blocked';

  return (
    <div className="min-h-screen flex bg-slate-100 font-sans">
      <aside className="w-64 bg-slate-800 text-slate-300 hidden lg:flex flex-col p-6 sticky top-0 h-screen overflow-y-auto">
        <div className="mb-8 space-y-3">
          <PlatformSignature label={shellLabel} tone="dark" />
          {isVerificationBlocked ? (
            <div className="flex items-center gap-3 text-white font-bold text-lg">
              <TenantMark tenant={tenant} />
              <span>{tenant.name}</span>
            </div>
          ) : (
            <button type="button" className="flex items-center gap-3 text-white font-bold text-lg cursor-pointer" onClick={() => navigation.onNavigateRoute('catalog')}>
              <TenantMark tenant={tenant} />
              <span>{tenant.name}</span>
            </button>
          )}
        </div>
        {isVerificationBlocked ? (
          <div className="space-y-4 rounded-2xl border border-amber-300/30 bg-amber-500/10 p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">Workspace Status</div>
            <div className="text-sm font-semibold text-white">{shellStatusLabel ?? 'Verification review in progress'}</div>
            <p className="text-xs leading-6 text-slate-300">
              Catalog management, RFQ workflows, and trade-capable operations stay unavailable until approval is recorded.
            </p>
          </div>
        ) : (
          <nav className="flex-1 space-y-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Dashboard</div>
            <button onClick={() => navigation.onNavigateRoute('catalog')} className="w-full flex items-center gap-3 text-white hover:bg-slate-700/50 p-2 rounded text-left transition">📦 Catalog</button>
            {hasShellRoute(navigation.surface, 'orders') && <button onClick={() => navigation.onNavigateRoute('orders')} className="w-full flex items-center gap-3 hover:text-white hover:bg-slate-700/50 p-2 rounded text-left transition">🛍️ Orders</button>}
            {hasShellRoute(navigation.surface, 'dpp') && <button onClick={() => navigation.onNavigateRoute('dpp')} className="w-full flex items-center gap-3 hover:text-white hover:bg-slate-700/50 p-2 rounded text-left transition">🔍 DPP Passport</button>}
            {hasShellRoute(navigation.surface, 'escrow') && <button onClick={() => navigation.onNavigateRoute('escrow')} className="w-full flex items-center gap-3 hover:text-white hover:bg-slate-700/50 p-2 rounded text-left transition">🔒 Escrow</button>}
            {hasShellRoute(navigation.surface, 'escalations') && <button onClick={() => navigation.onNavigateRoute('escalations')} className="w-full flex items-center gap-3 hover:text-white hover:bg-slate-700/50 p-2 rounded text-left transition">🚨 Escalations</button>}
            {hasShellRoute(navigation.surface, 'settlement') && <button onClick={() => navigation.onNavigateRoute('settlement')} className="w-full flex items-center gap-3 hover:text-white hover:bg-slate-700/50 p-2 rounded text-left transition">💸 Settlement</button>}
            {hasShellRoute(navigation.surface, 'certifications') && <button onClick={() => navigation.onNavigateRoute('certifications')} className="w-full flex items-center gap-3 hover:text-white hover:bg-slate-700/50 p-2 rounded text-left transition">📋 Certifications</button>}
            {hasShellRoute(navigation.surface, 'traceability') && <button onClick={() => navigation.onNavigateRoute('traceability')} className="w-full flex items-center gap-3 hover:text-white hover:bg-slate-700/50 p-2 rounded text-left transition">🔗 Traceability</button>}
            {hasShellRoute(navigation.surface, 'audit_logs') && <button onClick={() => navigation.onNavigateRoute('audit_logs')} className="w-full flex items-center gap-3 hover:text-white hover:bg-slate-700/50 p-2 rounded text-left transition">📋 Audit Log</button>}
            {hasShellRoute(navigation.surface, 'trades') && <button onClick={() => navigation.onNavigateRoute('trades')} className="w-full flex items-center gap-3 hover:text-white hover:bg-slate-700/50 p-2 rounded text-left transition">🤝 Trades</button>}
            <button onClick={navigation.onNavigateTeam} className="w-full flex items-center gap-3 hover:text-white hover:bg-slate-700/50 p-2 rounded text-left transition">👥 Members</button>
          </nav>
        )}
        <div className="mt-auto pt-6 border-t border-slate-700 text-[10px] text-slate-500 font-mono">
          {shellFooterLabel}
        </div>
      </aside>
      <div className="flex-1 flex flex-col relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 justify-between sticky top-0 z-10">
          <h2 className="font-semibold text-slate-600">{shellHeaderTitle}</h2>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-900">Alex Rivera</div>
              <div className="text-[10px] text-slate-500 uppercase">Administrator</div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-slate-200 border border-slate-300"></div>
          </div>
        </header>
        <main className="p-8 flex-1">{children}</main>
      </div>
    </div>
  );
};

export const B2CShell: React.FC<ShellProps> = ({ tenant, children, navigation }) => {
  const { itemCount } = useCart();
  const showAuthenticatedAffordances = navigation.showAuthenticatedAffordances ?? true;
  return (
  <div className="min-h-screen bg-white font-sans">
    <div className="bg-indigo-600 text-white text-center py-2 text-[10px] font-bold uppercase tracking-widest">
      Free worldwide shipping on orders over $500
    </div>
    <header className="border-b sticky top-0 bg-white/80 backdrop-blur-md z-50">
      <div className="max-w-7xl mx-auto p-4 flex justify-between items-center">
        <button type="button" className="flex items-center gap-3 cursor-pointer min-w-0" onClick={() => navigation.onNavigateRoute('home')}>
          <TenantMark tenant={tenant} sizeClassName="h-11 w-11" />
          <div className="flex flex-col items-start min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">TexQtic Storefront</span>
            <span className="text-2xl font-black text-indigo-600 tracking-tight truncate">{tenant.name}</span>
          </div>
        </button>
        <div className="flex-1 max-w-md mx-8">
          <input
            title="search"
            type="text"
            value={navigation.b2cSearchValue ?? ''}
            onChange={event => navigation.onB2CSearchChange?.(event.target.value)}
            placeholder="Search our collection..."
            className="w-full bg-slate-100 border-none rounded-full px-6 py-2.5 focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>
        {showAuthenticatedAffordances && (
          <div className="flex gap-6 items-center">
            {hasShellRoute(navigation.surface, 'orders') && <button onClick={() => navigation.onNavigateRoute('orders')} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition">Orders</button>}
            {hasShellRoute(navigation.surface, 'dpp') && <button onClick={() => navigation.onNavigateRoute('dpp')} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition">DPP Passport</button>}
            {hasShellRoute(navigation.surface, 'escrow') && <button onClick={() => navigation.onNavigateRoute('escrow')} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition">Escrow</button>}
            {hasShellRoute(navigation.surface, 'escalations') && <button onClick={() => navigation.onNavigateRoute('escalations')} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition">Escalations</button>}
            {hasShellRoute(navigation.surface, 'settlement') && <button onClick={() => navigation.onNavigateRoute('settlement')} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition">Settlement</button>}
            {hasShellRoute(navigation.surface, 'certifications') && <button onClick={() => navigation.onNavigateRoute('certifications')} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition">Certifications</button>}
            {hasShellRoute(navigation.surface, 'traceability') && <button onClick={() => navigation.onNavigateRoute('traceability')} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition">Traceability</button>}
            {hasShellRoute(navigation.surface, 'audit_logs') && <button onClick={() => navigation.onNavigateRoute('audit_logs')} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition">Audit Log</button>}
            {hasShellRoute(navigation.surface, 'trades') && <button onClick={() => navigation.onNavigateRoute('trades')} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition">Trades</button>}
            <button onClick={navigation.onNavigateTeam} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition">Team</button>
            <button onClick={() => navigation.onNavigateRoute('cart')} className="relative cursor-pointer" title="Shopping Cart">
              <span className="text-2xl">🛒</span>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </header>
    <main className="max-w-7xl mx-auto p-6 relative">{children}</main>
  </div>
  );
};

export const WhiteLabelShell: React.FC<ShellProps> = ({ tenant, children, navigation }) => (
  <div className="min-h-screen font-sans" style={{ backgroundColor: '#ffffff' }}>
     <header className="p-12 text-center" style={{ borderBottom: `1px solid #eee` }}>
       <button type="button" className="text-5xl font-serif italic mb-2 cursor-pointer transition-opacity hover:opacity-80" style={{ color: tenant.theme.primaryColor }} onClick={() => navigation.onNavigateRoute('home')}>
         {tenant.name}
       </button>
       <div className="text-slate-400 text-[10px] font-bold tracking-[0.3em] uppercase">Maison de Commerce</div>
     </header>
     <nav className="flex justify-center gap-12 py-6 text-[10px] font-bold uppercase tracking-[0.2em] border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur-sm z-10">
        <button onClick={() => navigation.onNavigateRoute('home')} className="hover:opacity-40 transition-opacity">Portfolio</button>
        <button onClick={navigation.onNavigateTeam} className="hover:opacity-40 transition-opacity">Access Control</button>
        {hasShellRoute(navigation.surface, 'orders') && <button onClick={() => navigation.onNavigateRoute('orders')} className="hover:opacity-40 transition-opacity">Orders</button>}
        {hasShellRoute(navigation.surface, 'dpp') && <button onClick={() => navigation.onNavigateRoute('dpp')} className="hover:opacity-40 transition-opacity">DPP Snapshot</button>}
        {hasShellRoute(navigation.surface, 'escrow') && <button onClick={() => navigation.onNavigateRoute('escrow')} className="hover:opacity-40 transition-opacity">Escrow</button>}
        {hasShellRoute(navigation.surface, 'escalations') && <button onClick={() => navigation.onNavigateRoute('escalations')} className="hover:opacity-40 transition-opacity">Escalations</button>}
        {hasShellRoute(navigation.surface, 'settlement') && <button onClick={() => navigation.onNavigateRoute('settlement')} className="hover:opacity-40 transition-opacity">Settlement</button>}
        {hasShellRoute(navigation.surface, 'certifications') && <button onClick={() => navigation.onNavigateRoute('certifications')} className="hover:opacity-40 transition-opacity">Certifications</button>}
        {hasShellRoute(navigation.surface, 'traceability') && <button onClick={() => navigation.onNavigateRoute('traceability')} className="hover:opacity-40 transition-opacity">Traceability</button>}
        {hasShellRoute(navigation.surface, 'audit_logs') && <button onClick={() => navigation.onNavigateRoute('audit_logs')} className="hover:opacity-40 transition-opacity">Audit Log</button>}
        {hasShellRoute(navigation.surface, 'trades') && <button onClick={() => navigation.onNavigateRoute('trades')} className="hover:opacity-40 transition-opacity">Trades</button>}
     </nav>
     <main className="max-w-screen-xl mx-auto py-12 px-6 relative">
       {children}
     </main>
  </div>
);

// ── WhiteLabelAdminShell ───────────────────────────────────────────────────────
// Wave 4 P1: Store Admin back-office console for WL OWNER / ADMIN users.
// Rendered when appState === 'WL_ADMIN'. The storefront shell (WhiteLabelShell)
// remains reachable via the "← Storefront" link at the bottom of the sidebar.

interface WLAdminShellProps {
  tenant: TenantConfig;
  children: React.ReactNode;
  navigation: RuntimeShellNavigationSurface | null;
  onNavigateRoute: (routeKey: RuntimeLocalRouteKey) => void;
  onNavigateStorefront?: () => void;
}

const WL_ADMIN_NAV = [
  { routeKey: 'branding',    label: 'Store Profile',  icon: '🎨' },
  { routeKey: 'staff',       label: 'Staff',          icon: '👥' },
  { routeKey: 'products',    label: 'Products',       icon: '📦' },
  { routeKey: 'collections', label: 'Collections',    icon: '🗂️' },
  { routeKey: 'orders',      label: 'Orders',         icon: '🛍️' },
  { routeKey: 'domains',     label: 'Domains',        icon: '🌐' },
] as const;

export const WhiteLabelAdminShell: React.FC<WLAdminShellProps> = ({
  tenant,
  children,
  navigation,
  onNavigateRoute,
  onNavigateStorefront,
}) => (
  <div className="min-h-screen flex bg-white font-sans">
    <aside className="w-60 border-r border-slate-100 flex flex-col py-8 px-6 sticky top-0 h-screen overflow-y-auto">
      <div className="mb-8">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Store Admin</div>
        <div
          className="font-serif italic text-lg truncate"
          style={{ color: tenant.theme.primaryColor }}
        >
          {tenant.name}
        </div>
      </div>
      <nav className="flex-1 space-y-1">
        {WL_ADMIN_NAV.map(({ routeKey, label, icon }) => {
          const isVisible = hasShellRoute(navigation, routeKey);

          if (!isVisible) {
            return null;
          }

          const isActive = navigation?.items.some(item => item.routeKey === routeKey && item.active) ?? false;

          return (
          <button
            key={routeKey}
            onClick={() => onNavigateRoute(routeKey)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
              isActive
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className="text-base leading-none">{icon}</span>
            <span>{label}</span>
          </button>
          );
        })}
      </nav>
      {onNavigateStorefront && (
        <button
          onClick={onNavigateStorefront}
          className="mt-6 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1"
        >
          ← Storefront
        </button>
      )}
      <div className="mt-4 pt-4 border-t border-slate-100 text-[9px] text-slate-300 font-mono">
        WL Admin · Wave 4 P1
      </div>
    </aside>
    <div className="flex-1 flex flex-col min-h-screen">
      <header className="h-14 border-b border-slate-100 flex items-center px-8 justify-between sticky top-0 bg-white z-10">
        <h2 className="font-semibold text-slate-700 text-sm">
          {WL_ADMIN_NAV.find(item => navigation?.items.some(entry => entry.routeKey === item.routeKey && entry.active))?.label ?? 'Store Admin'}
        </h2>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border border-slate-200 px-3 py-1 rounded-full">
          White Label
        </span>
      </header>
      <main className="flex-1 p-8 bg-slate-50 relative">{children}</main>
    </div>
  </div>
);
