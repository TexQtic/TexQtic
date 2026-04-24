
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

interface MobileShellMenuItem {
  key: string;
  label: string;
  onSelect?: () => void;
  kind?: 'action' | 'section';
  active?: boolean;
}

interface MobileShellMenuProps {
  shellId: string;
  title: string;
  items: MobileShellMenuItem[];
  tone?: 'light' | 'dark';
  breakpoint?: 'md' | 'lg';
  align?: 'left' | 'right';
}

const hasShellRoute = (surface: RuntimeShellNavigationSurface | null, routeKey: RuntimeLocalRouteKey) => {
  return surface?.items.some(item => item.routeKey === routeKey) ?? false;
};

const AGGREGATOR_DISCOVERY_GROUP_KEYS = new Set(['home_landing']);
const AGGREGATOR_SHARED_CONTINUATION_GROUP_KEYS = new Set([
  'orders_operations',
  'rfq_sourcing',
  'operational_workspace',
]);

const AGGREGATOR_ROUTE_LABELS: Partial<Record<RuntimeLocalRouteKey, string>> = {
  home: 'Companies',
  orders: 'Orders',
  dpp: 'DPP Passport',
  escrow: 'Escrow',
  escalations: 'Escalations',
  settlement: 'Settlement',
  certifications: 'Certifications',
  traceability: 'Traceability',
  audit_logs: 'Audit Log',
  trades: 'Trades',
};

const buildAggregatorNavigationItems = (
  surface: RuntimeShellNavigationSurface | null,
  routeGroupKeys: ReadonlySet<string>,
  onNavigateRoute: (routeKey: RuntimeLocalRouteKey) => void,
): MobileShellMenuItem[] => {
  return (surface?.items ?? []).flatMap(item => {
    if (!routeGroupKeys.has(item.routeGroupKey)) {
      return [];
    }

    const label = AGGREGATOR_ROUTE_LABELS[item.routeKey];
    if (!label) {
      return [];
    }

    return [{
      key: item.routeKey,
      label,
      onSelect: () => onNavigateRoute(item.routeKey),
      active: item.active,
    }];
  });
};

const AggregatorDesktopNavSection: React.FC<{
  title: string;
  items: MobileShellMenuItem[];
}> = ({ title, items }) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {title}
      </div>
      <div className="flex flex-wrap gap-4 text-sm font-medium">
        {items.map(item => (
          <button
            key={item.key}
            type="button"
            onClick={item.onSelect}
            className={item.active ? 'text-blue-400' : 'text-slate-300 hover:text-blue-400 transition'}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
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

const MobileShellMenu: React.FC<MobileShellMenuProps> = ({
  shellId,
  title,
  items,
  tone = 'light',
  breakpoint = 'md',
  align = 'right',
}) => {
  const menuRef = React.useRef<HTMLDetailsElement>(null);

  if (items.length === 0) {
    return null;
  }

  const hiddenClassName = breakpoint === 'lg' ? 'lg:hidden' : 'md:hidden';
  const alignClassName = align === 'left' ? 'left-0' : 'right-0';
  const summaryClassName = tone === 'dark'
    ? 'border-white/10 bg-white/10 text-white hover:bg-white/15'
    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50';
  const panelClassName = tone === 'dark'
    ? 'border-slate-700 bg-slate-900 text-white shadow-2xl'
    : 'border-slate-200 bg-white text-slate-900 shadow-xl';
  const labelClassName = tone === 'dark' ? 'text-slate-400' : 'text-slate-500';
  const itemClassName = tone === 'dark'
    ? 'text-slate-100 hover:bg-white/10'
    : 'text-slate-700 hover:bg-slate-100';
  const sectionClassName = tone === 'dark'
    ? 'px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500'
    : 'px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400';
  const actionCount = items.filter(item => item.kind !== 'section').length;

  return (
    <details
      ref={menuRef}
      data-mobile-nav={shellId}
      data-mobile-item-count={actionCount}
      className={`${hiddenClassName} relative`}
    >
      <summary
        aria-label={`Open ${title}`}
        className={`flex h-10 min-w-10 cursor-pointer list-none items-center justify-center rounded-xl border px-3 text-sm font-semibold shadow-sm transition [&::-webkit-details-marker]:hidden ${summaryClassName}`}
      >
        <span aria-hidden="true" className="text-base leading-none">☰</span>
        <span className="sr-only">{title}</span>
      </summary>
      <div
        className={`absolute ${alignClassName} top-full z-50 mt-3 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border p-3 ${panelClassName}`}
      >
        <div className={`px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.22em] ${labelClassName}`}>
          Navigation
        </div>
        <nav className="space-y-1">
          {items.map(item => {
            if (item.kind === 'section') {
              return (
                <div key={item.key} className={sectionClassName}>
                  {item.label}
                </div>
              );
            }

            return (
              <button
                key={item.key}
                type="button"
                data-mobile-nav-item={item.key}
                onClick={() => {
                  if (menuRef.current) {
                    menuRef.current.open = false;
                  }
                  item.onSelect?.();
                }}
                className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${itemClassName}`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </details>
  );
};

export const AggregatorShell: React.FC<ShellProps> = ({ tenant, children, navigation }) => {
  const discoveryItems = buildAggregatorNavigationItems(
    navigation.surface,
    AGGREGATOR_DISCOVERY_GROUP_KEYS,
    navigation.onNavigateRoute,
  );
  const sharedContinuationItems = buildAggregatorNavigationItems(
    navigation.surface,
    AGGREGATOR_SHARED_CONTINUATION_GROUP_KEYS,
    navigation.onNavigateRoute,
  );
  const sharedCoreItems: MobileShellMenuItem[] = [
    { key: 'team', label: 'Team Access', onSelect: navigation.onNavigateTeam },
  ];
  const mobileMenuItems: MobileShellMenuItem[] = [
    { key: 'aggregator-discovery', label: 'Discovery Capability', kind: 'section' },
    ...discoveryItems,
    ...(sharedContinuationItems.length > 0
      ? [
          { key: 'aggregator-shared-continuation', label: 'Shared Continuation', kind: 'section' as const },
          ...sharedContinuationItems,
        ]
      : []),
    { key: 'aggregator-shared-core', label: 'Shared Core', kind: 'section' },
    ...sharedCoreItems,
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="sticky top-0 z-50 bg-slate-900 p-4 text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 md:flex-nowrap md:gap-6">
          <div className="flex min-w-0 items-center gap-4">
            <button type="button" className="flex min-w-0 items-center gap-3 text-xl font-bold cursor-pointer" onClick={() => navigation.onNavigateRoute('home')}>
              <TenantMark tenant={tenant} />
              <span className="truncate">{tenant.name}</span>
            </button>
            <div className="hidden sm:block">
              <PlatformSignature label="Discovery Capability" tone="dark" />
            </div>
          </div>
          <nav className="hidden md:flex flex-wrap items-start gap-6">
            <AggregatorDesktopNavSection title="Discovery Capability" items={discoveryItems} />
            <AggregatorDesktopNavSection title="Shared Continuation" items={sharedContinuationItems} />
            <AggregatorDesktopNavSection title="Shared Core" items={sharedCoreItems} />
          </nav>
          <MobileShellMenu
            shellId="aggregator"
            title="aggregator navigation menu"
            items={mobileMenuItems}
            tone="dark"
            breakpoint="md"
          />
        </div>
      </header>
      <main className="relative flex-1 bg-slate-50">{children}</main>
    </div>
  );
};

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
  const mobileMenuItems: MobileShellMenuItem[] = isVerificationBlocked
    ? []
    : [
        { key: 'catalog', label: 'Catalog', onSelect: () => navigation.onNavigateRoute('catalog') },
        ...(hasShellRoute(navigation.surface, 'buyer_catalog') ? [{ key: 'buyer_catalog', label: 'Browse Suppliers', onSelect: () => navigation.onNavigateRoute('buyer_catalog') }] : []),
        ...(hasShellRoute(navigation.surface, 'orders') ? [{ key: 'orders', label: 'Orders', onSelect: () => navigation.onNavigateRoute('orders') }] : []),
        ...(hasShellRoute(navigation.surface, 'dpp') ? [{ key: 'dpp', label: 'DPP Passport', onSelect: () => navigation.onNavigateRoute('dpp') }] : []),
        ...(hasShellRoute(navigation.surface, 'escrow') ? [{ key: 'escrow', label: 'Escrow', onSelect: () => navigation.onNavigateRoute('escrow') }] : []),
        ...(hasShellRoute(navigation.surface, 'escalations') ? [{ key: 'escalations', label: 'Escalations', onSelect: () => navigation.onNavigateRoute('escalations') }] : []),
        ...(hasShellRoute(navigation.surface, 'settlement') ? [{ key: 'settlement', label: 'Settlement', onSelect: () => navigation.onNavigateRoute('settlement') }] : []),
        ...(hasShellRoute(navigation.surface, 'certifications') ? [{ key: 'certifications', label: 'Certifications', onSelect: () => navigation.onNavigateRoute('certifications') }] : []),
        ...(hasShellRoute(navigation.surface, 'traceability') ? [{ key: 'traceability', label: 'Traceability', onSelect: () => navigation.onNavigateRoute('traceability') }] : []),
        ...(hasShellRoute(navigation.surface, 'audit_logs') ? [{ key: 'audit_logs', label: 'Audit Log', onSelect: () => navigation.onNavigateRoute('audit_logs') }] : []),
        ...(hasShellRoute(navigation.surface, 'trades') ? [{ key: 'trades', label: 'Trades', onSelect: () => navigation.onNavigateRoute('trades') }] : []),
        { key: 'team', label: 'Team Access', onSelect: navigation.onNavigateTeam },
      ];

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
            {hasShellRoute(navigation.surface, 'buyer_catalog') && <button onClick={() => navigation.onNavigateRoute('buyer_catalog')} className="w-full flex items-center gap-3 hover:text-white hover:bg-slate-700/50 p-2 rounded text-left transition">🏪 Browse Suppliers</button>}
            {hasShellRoute(navigation.surface, 'orders') && <button onClick={() => navigation.onNavigateRoute('orders')} className="w-full flex items-center gap-3 hover:text-white hover:bg-slate-700/50 p-2 rounded text-left transition">🛍️ Orders</button>}
            {hasShellRoute(navigation.surface, 'dpp') && <button onClick={() => navigation.onNavigateRoute('dpp')} className="w-full flex items-center gap-3 hover:text-white hover:bg-slate-700/50 p-2 rounded text-left transition">🔍 DPP Passport</button>}
            {hasShellRoute(navigation.surface, 'escrow') && <button onClick={() => navigation.onNavigateRoute('escrow')} className="w-full flex items-center gap-3 hover:text-white hover:bg-slate-700/50 p-2 rounded text-left transition">🔒 Escrow</button>}
            {hasShellRoute(navigation.surface, 'escalations') && <button onClick={() => navigation.onNavigateRoute('escalations')} className="w-full flex items-center gap-3 hover:text-white hover:bg-slate-700/50 p-2 rounded text-left transition">🚨 Escalations</button>}
            {hasShellRoute(navigation.surface, 'settlement') && <button onClick={() => navigation.onNavigateRoute('settlement')} className="w-full flex items-center gap-3 hover:text-white hover:bg-slate-700/50 p-2 rounded text-left transition">💸 Settlement</button>}
            {hasShellRoute(navigation.surface, 'certifications') && <button onClick={() => navigation.onNavigateRoute('certifications')} className="w-full flex items-center gap-3 hover:text-white hover:bg-slate-700/50 p-2 rounded text-left transition">📋 Certifications</button>}
            {hasShellRoute(navigation.surface, 'traceability') && <button onClick={() => navigation.onNavigateRoute('traceability')} className="w-full flex items-center gap-3 hover:text-white hover:bg-slate-700/50 p-2 rounded text-left transition">🔗 Traceability</button>}
            {hasShellRoute(navigation.surface, 'audit_logs') && <button onClick={() => navigation.onNavigateRoute('audit_logs')} className="w-full flex items-center gap-3 hover:text-white hover:bg-slate-700/50 p-2 rounded text-left transition">📋 Audit Log</button>}
            {hasShellRoute(navigation.surface, 'trades') && <button onClick={() => navigation.onNavigateRoute('trades')} className="w-full flex items-center gap-3 hover:text-white hover:bg-slate-700/50 p-2 rounded text-left transition">🤝 Trades</button>}
            <button onClick={navigation.onNavigateTeam} className="w-full flex items-center gap-3 hover:text-white hover:bg-slate-700/50 p-2 rounded text-left transition">👥 Team Access</button>
          </nav>
        )}
        <div className="mt-auto pt-6 border-t border-slate-700 text-[10px] text-slate-500 font-mono">
          {shellFooterLabel}
        </div>
      </aside>
      <div className="flex-1 flex flex-col relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 sm:px-6 lg:px-8 justify-between sticky top-0 z-10">
          <div className="flex min-w-0 items-center gap-3">
            <MobileShellMenu
              shellId="b2b"
              title="workspace navigation menu"
              items={mobileMenuItems}
              tone="light"
              breakpoint="lg"
              align="left"
            />
            <h2 className="font-semibold text-slate-600 truncate">{shellHeaderTitle}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-900">Alex Rivera</div>
              <div className="text-[10px] text-slate-500 uppercase">Administrator</div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-slate-200 border border-slate-300"></div>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8 flex-1">{children}</main>
      </div>
    </div>
  );
};

export const B2CShell: React.FC<ShellProps> = ({ tenant, children, navigation }) => {
  const { itemCount } = useCart();
  const showAuthenticatedAffordances = navigation.showAuthenticatedAffordances ?? true;
  const mobileMenuItems: MobileShellMenuItem[] = [
    { key: 'home', label: 'Home', onSelect: () => navigation.onNavigateRoute('home') },
    ...(showAuthenticatedAffordances && hasShellRoute(navigation.surface, 'orders') ? [{ key: 'orders', label: 'Orders', onSelect: () => navigation.onNavigateRoute('orders') }] : []),
    ...(showAuthenticatedAffordances && hasShellRoute(navigation.surface, 'dpp') ? [{ key: 'dpp', label: 'DPP Passport', onSelect: () => navigation.onNavigateRoute('dpp') }] : []),
    ...(showAuthenticatedAffordances && hasShellRoute(navigation.surface, 'escrow') ? [{ key: 'escrow', label: 'Escrow', onSelect: () => navigation.onNavigateRoute('escrow') }] : []),
    ...(showAuthenticatedAffordances && hasShellRoute(navigation.surface, 'escalations') ? [{ key: 'escalations', label: 'Escalations', onSelect: () => navigation.onNavigateRoute('escalations') }] : []),
    ...(showAuthenticatedAffordances && hasShellRoute(navigation.surface, 'settlement') ? [{ key: 'settlement', label: 'Settlement', onSelect: () => navigation.onNavigateRoute('settlement') }] : []),
    ...(showAuthenticatedAffordances && hasShellRoute(navigation.surface, 'certifications') ? [{ key: 'certifications', label: 'Certifications', onSelect: () => navigation.onNavigateRoute('certifications') }] : []),
    ...(showAuthenticatedAffordances && hasShellRoute(navigation.surface, 'traceability') ? [{ key: 'traceability', label: 'Traceability', onSelect: () => navigation.onNavigateRoute('traceability') }] : []),
    ...(showAuthenticatedAffordances && hasShellRoute(navigation.surface, 'audit_logs') ? [{ key: 'audit_logs', label: 'Audit Log', onSelect: () => navigation.onNavigateRoute('audit_logs') }] : []),
    ...(showAuthenticatedAffordances && hasShellRoute(navigation.surface, 'trades') ? [{ key: 'trades', label: 'Trades', onSelect: () => navigation.onNavigateRoute('trades') }] : []),
    ...(showAuthenticatedAffordances ? [{ key: 'team', label: 'Team Access', onSelect: navigation.onNavigateTeam }] : []),
    ...(showAuthenticatedAffordances && hasShellRoute(navigation.surface, 'cart') ? [{ key: 'cart', label: 'Shopping Cart', onSelect: () => navigation.onNavigateRoute('cart') }] : []),
  ];

  return (
  <div className="min-h-screen bg-white font-sans">
    <div className="bg-indigo-600 text-white text-center py-2 text-[10px] font-bold uppercase tracking-widest">
      Free worldwide shipping on orders over $500
    </div>
    <header className="border-b sticky top-0 bg-white/80 backdrop-blur-md z-50">
      <div className="max-w-7xl mx-auto p-4 flex flex-wrap md:flex-nowrap items-center gap-4">
        <div className="flex w-full items-center justify-between gap-3 md:w-auto min-w-0">
          <button type="button" className="flex items-center gap-3 cursor-pointer min-w-0" onClick={() => navigation.onNavigateRoute('home')}>
            <TenantMark tenant={tenant} sizeClassName="h-11 w-11" />
            <div className="flex flex-col items-start min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">TexQtic Storefront</span>
              <span className="text-xl md:text-2xl font-black text-indigo-600 tracking-tight truncate">{tenant.name}</span>
            </div>
          </button>
          {showAuthenticatedAffordances && (
            <div className="flex items-center gap-3 md:hidden">
              {hasShellRoute(navigation.surface, 'cart') && (
                <button onClick={() => navigation.onNavigateRoute('cart')} className="relative cursor-pointer" title="Shopping Cart">
                  <span className="text-2xl">🛒</span>
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                      {itemCount}
                    </span>
                  )}
                </button>
              )}
              <MobileShellMenu
                shellId="b2c"
                title="storefront navigation menu"
                items={mobileMenuItems}
                tone="light"
                breakpoint="md"
              />
            </div>
          )}
        </div>
        <div className="order-3 w-full md:order-none md:flex-1 md:max-w-md md:mx-8">
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
          <div className="hidden md:flex gap-6 items-center">
            {hasShellRoute(navigation.surface, 'orders') && <button onClick={() => navigation.onNavigateRoute('orders')} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition">Orders</button>}
            {hasShellRoute(navigation.surface, 'dpp') && <button onClick={() => navigation.onNavigateRoute('dpp')} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition">DPP Passport</button>}
            {hasShellRoute(navigation.surface, 'escrow') && <button onClick={() => navigation.onNavigateRoute('escrow')} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition">Escrow</button>}
            {hasShellRoute(navigation.surface, 'escalations') && <button onClick={() => navigation.onNavigateRoute('escalations')} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition">Escalations</button>}
            {hasShellRoute(navigation.surface, 'settlement') && <button onClick={() => navigation.onNavigateRoute('settlement')} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition">Settlement</button>}
            {hasShellRoute(navigation.surface, 'certifications') && <button onClick={() => navigation.onNavigateRoute('certifications')} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition">Certifications</button>}
            {hasShellRoute(navigation.surface, 'traceability') && <button onClick={() => navigation.onNavigateRoute('traceability')} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition">Traceability</button>}
            {hasShellRoute(navigation.surface, 'audit_logs') && <button onClick={() => navigation.onNavigateRoute('audit_logs')} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition">Audit Log</button>}
            {hasShellRoute(navigation.surface, 'trades') && <button onClick={() => navigation.onNavigateRoute('trades')} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition">Trades</button>}
            <button onClick={navigation.onNavigateTeam} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition">Team Access</button>
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
    <main className="max-w-7xl mx-auto p-4 sm:p-6 relative">{children}</main>
  </div>
  );
};

export const WhiteLabelShell: React.FC<ShellProps> = ({ tenant, children, navigation }) => {
  const mobileMenuItems: MobileShellMenuItem[] = [
    { key: 'home', label: 'Portfolio', onSelect: () => navigation.onNavigateRoute('home') },
    { key: 'team', label: 'Team Access', onSelect: navigation.onNavigateTeam },
    ...(hasShellRoute(navigation.surface, 'orders') ? [{ key: 'orders', label: 'Orders', onSelect: () => navigation.onNavigateRoute('orders') }] : []),
    ...(hasShellRoute(navigation.surface, 'dpp') ? [{ key: 'dpp', label: 'DPP Snapshot', onSelect: () => navigation.onNavigateRoute('dpp') }] : []),
    ...(hasShellRoute(navigation.surface, 'escrow') ? [{ key: 'escrow', label: 'Escrow', onSelect: () => navigation.onNavigateRoute('escrow') }] : []),
    ...(hasShellRoute(navigation.surface, 'escalations') ? [{ key: 'escalations', label: 'Escalations', onSelect: () => navigation.onNavigateRoute('escalations') }] : []),
    ...(hasShellRoute(navigation.surface, 'settlement') ? [{ key: 'settlement', label: 'Settlement', onSelect: () => navigation.onNavigateRoute('settlement') }] : []),
    ...(hasShellRoute(navigation.surface, 'certifications') ? [{ key: 'certifications', label: 'Certifications', onSelect: () => navigation.onNavigateRoute('certifications') }] : []),
    ...(hasShellRoute(navigation.surface, 'traceability') ? [{ key: 'traceability', label: 'Traceability', onSelect: () => navigation.onNavigateRoute('traceability') }] : []),
    ...(hasShellRoute(navigation.surface, 'audit_logs') ? [{ key: 'audit_logs', label: 'Audit Log', onSelect: () => navigation.onNavigateRoute('audit_logs') }] : []),
    ...(hasShellRoute(navigation.surface, 'trades') ? [{ key: 'trades', label: 'Trades', onSelect: () => navigation.onNavigateRoute('trades') }] : []),
  ];

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: '#ffffff' }}>
       <header className="px-6 py-8 text-center md:p-12" style={{ borderBottom: `1px solid #eee` }}>
         <button type="button" className="text-3xl md:text-5xl font-serif italic mb-2 cursor-pointer transition-opacity hover:opacity-80" style={{ color: tenant.theme.primaryColor }} onClick={() => navigation.onNavigateRoute('home')}>
           {tenant.name}
         </button>
         <div className="text-slate-400 text-[10px] font-bold tracking-[0.3em] uppercase">Maison de Commerce</div>
       </header>
       <nav className="border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur-sm z-10">
          <div className="flex justify-end px-4 py-3 md:hidden">
            <MobileShellMenu
              shellId="wl-storefront"
              title="white-label storefront navigation menu"
              items={mobileMenuItems}
              tone="light"
              breakpoint="md"
            />
          </div>
          <div className="hidden md:flex justify-center gap-12 py-6 text-[10px] font-bold uppercase tracking-[0.2em]">
            <button onClick={() => navigation.onNavigateRoute('home')} className="hover:opacity-40 transition-opacity">Portfolio</button>
            <button onClick={navigation.onNavigateTeam} className="hover:opacity-40 transition-opacity">Team Access</button>
            {hasShellRoute(navigation.surface, 'orders') && <button onClick={() => navigation.onNavigateRoute('orders')} className="hover:opacity-40 transition-opacity">Orders</button>}
            {hasShellRoute(navigation.surface, 'dpp') && <button onClick={() => navigation.onNavigateRoute('dpp')} className="hover:opacity-40 transition-opacity">DPP Snapshot</button>}
            {hasShellRoute(navigation.surface, 'escrow') && <button onClick={() => navigation.onNavigateRoute('escrow')} className="hover:opacity-40 transition-opacity">Escrow</button>}
            {hasShellRoute(navigation.surface, 'escalations') && <button onClick={() => navigation.onNavigateRoute('escalations')} className="hover:opacity-40 transition-opacity">Escalations</button>}
            {hasShellRoute(navigation.surface, 'settlement') && <button onClick={() => navigation.onNavigateRoute('settlement')} className="hover:opacity-40 transition-opacity">Settlement</button>}
            {hasShellRoute(navigation.surface, 'certifications') && <button onClick={() => navigation.onNavigateRoute('certifications')} className="hover:opacity-40 transition-opacity">Certifications</button>}
            {hasShellRoute(navigation.surface, 'traceability') && <button onClick={() => navigation.onNavigateRoute('traceability')} className="hover:opacity-40 transition-opacity">Traceability</button>}
            {hasShellRoute(navigation.surface, 'audit_logs') && <button onClick={() => navigation.onNavigateRoute('audit_logs')} className="hover:opacity-40 transition-opacity">Audit Log</button>}
            {hasShellRoute(navigation.surface, 'trades') && <button onClick={() => navigation.onNavigateRoute('trades')} className="hover:opacity-40 transition-opacity">Trades</button>}
          </div>
       </nav>
       <main className="max-w-screen-xl mx-auto py-8 px-4 md:py-12 md:px-6 relative">
         {children}
       </main>
    </div>
  );
};

// ── WhiteLabelAdminShell ───────────────────────────────────────────────────────
// Wave 4 P1: White-label admin overlay for WL OWNER / ADMIN users.
// Rendered when appState === 'WL_ADMIN'. The storefront shell remains reachable
// so the overlay stays visibly tied to tenant storefront continuity.

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
}) => {
  const mobileMenuItems: MobileShellMenuItem[] = WL_ADMIN_NAV
    .filter(({ routeKey }) => hasShellRoute(navigation, routeKey))
    .map(({ routeKey, label }) => ({
      key: routeKey,
      label,
      onSelect: () => onNavigateRoute(routeKey),
    }));

  if (onNavigateStorefront) {
    mobileMenuItems.push({
      key: 'storefront',
      label: 'Return to Storefront',
      onSelect: onNavigateStorefront,
    });
  }

  return (
  <div className="min-h-screen flex bg-white font-sans">
    <aside className="hidden lg:flex w-60 border-r border-slate-100 flex-col py-8 px-6 sticky top-0 h-screen overflow-y-auto">
      <div className="mb-8">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">White-Label Admin Overlay</div>
        <div
          className="font-serif italic text-lg truncate"
          style={{ color: tenant.theme.primaryColor }}
        >
          {tenant.name}
        </div>
        <div className="mt-2 text-[11px] leading-5 text-slate-500">
          Storefront-linked controls for this tenant.
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
          ← Return to Storefront
        </button>
      )}
      <div className="mt-4 pt-4 border-t border-slate-100 text-[9px] text-slate-300 font-mono">
        WL Admin Overlay · Wave 4 P1
      </div>
    </aside>
    <div className="flex-1 flex flex-col min-h-screen">
      <header className="h-14 border-b border-slate-100 flex items-center px-4 sm:px-6 lg:px-8 justify-between sticky top-0 bg-white z-10">
        <div className="flex min-w-0 items-center gap-3">
          <MobileShellMenu
            shellId="wl-admin"
            title="white-label admin overlay navigation menu"
            items={mobileMenuItems}
            tone="light"
            breakpoint="lg"
            align="left"
          />
          <h2 className="font-semibold text-slate-700 text-sm truncate">
            {WL_ADMIN_NAV.find(item => navigation?.items.some(entry => entry.routeKey === item.routeKey && entry.active))?.label ?? 'Admin Overlay'}
          </h2>
        </div>
        <span className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-widest text-slate-400 border border-slate-200 px-3 py-1 rounded-full">
          Storefront-linked overlay
        </span>
      </header>
      <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-slate-50 relative">{children}</main>
    </div>
  </div>
  );
};
