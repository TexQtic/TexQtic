import React, { useState, useEffect, useRef } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

export type PublicNavSection =
  | 'home'
  | 'b2b'
  | 'products'
  | 'collections'
  | 'industry'
  | 'trust'
  | 'aggregator'
  | 'inquiry';

export interface PublicNavbarProps {
  readonly activeSection?: PublicNavSection;
  readonly onGoHome: () => void;
  readonly onGoB2B: () => void;
  readonly onGoProducts: () => void;
  readonly onGoCollections: () => void;
  readonly onGoIndustry: () => void;
  readonly onGoTrust: () => void;
  readonly onGoAggregator: () => void;
  readonly onGoInquiry: () => void;
  readonly onSignIn: () => void;
  readonly onRequestAccess: () => void;
}

// ── Nav link config ────────────────────────────────────────────────────────────

const NAV_LINKS: ReadonlyArray<{
  readonly label: string;
  readonly section: PublicNavSection;
}> = [
  { label: 'Home', section: 'home' },
  { label: 'B2B Network', section: 'b2b' },
  { label: 'Products', section: 'products' },
  { label: 'Collections', section: 'collections' },
  { label: 'Industry & Clusters', section: 'industry' },
  { label: 'Trust & Origin', section: 'trust' },
  { label: 'Aggregator Preview', section: 'aggregator' },
  { label: 'Inquire', section: 'inquiry' },
];

// ── Icons ──────────────────────────────────────────────────────────────────────

function HamburgerIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export function PublicNavbar({
  activeSection,
  onGoHome,
  onGoB2B,
  onGoProducts,
  onGoCollections,
  onGoIndustry,
  onGoTrust,
  onGoAggregator,
  onGoInquiry,
  onSignIn,
  onRequestAccess,
}: PublicNavbarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  // eslint-disable-next-line no-undef
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  // eslint-disable-next-line no-undef
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerId = 'public-nav-drawer';

  const navActions: Record<PublicNavSection, () => void> = {
    home: onGoHome,
    b2b: onGoB2B,
    products: onGoProducts,
    collections: onGoCollections,
    industry: onGoIndustry,
    trust: onGoTrust,
    aggregator: onGoAggregator,
    inquiry: onGoInquiry,
  };

  // Move focus into drawer when opened
  useEffect(() => {
    if (drawerOpen) {
      closeButtonRef.current?.focus();
    }
  }, [drawerOpen]);

  // Keep keyboard focus trapped inside drawer while it is open
  useEffect(() => {
    if (!drawerOpen) return;

    const handleTabTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const drawer = document.getElementById(drawerId);
      if (!drawer) return;

      const focusableElements = Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

      if (focusableElements.length === 0) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const focusInsideDrawer = !!active && drawer.contains(active);

      if (e.shiftKey) {
        if (!focusInsideDrawer || active === first) {
          e.preventDefault();
          last.focus();
        }
        return;
      }

      if (!focusInsideDrawer || active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleTabTrap);
    return () => document.removeEventListener('keydown', handleTabTrap);
  }, [drawerOpen, drawerId]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  // Close drawer on Escape key
  useEffect(() => {
    if (!drawerOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        hamburgerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [drawerOpen]);

  const handleNavLink = (section: PublicNavSection) => {
    navActions[section]();
    setDrawerOpen(false);
  };

  const desktopLinkClass = (section: PublicNavSection) =>
    section === activeSection
      ? 'rounded-full bg-[#eff6f8] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#0a2036] transition'
      : 'rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-600 transition hover:bg-[#eff6f8] hover:text-[#0a2036]';

  const drawerLinkClass = (section: PublicNavSection) =>
    section === activeSection
      ? 'w-full rounded-xl bg-[#eff6f8] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.22em] text-[#0a2036]'
      : 'w-full rounded-xl px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.22em] text-slate-600 transition hover:bg-[#f3f8fb]';

  return (
    <header className="border-b border-[#d6e4e8] bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        {/* Logo — acts as Home link */}
        <button
          type="button"
          onClick={() => handleNavLink('home')}
          aria-label="TexQtic — go to home"
          className="flex-shrink-0"
        >
          <img
            src="/brand/texqtic-logo.png"
            alt="TexQtic"
            className="h-10 w-auto"
            loading="eager"
          />
        </button>

        {/* Desktop / large-tablet horizontal nav — hidden below lg (1024px) */}
        <nav
          aria-label="Public navigation"
          className="hidden lg:flex items-center gap-0.5"
        >
          {NAV_LINKS.map(({ label, section }) => (
            <button
              key={section}
              type="button"
              onClick={() => handleNavLink(section)}
              aria-current={section === activeSection ? 'page' : undefined}
              className={desktopLinkClass(section)}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Right cluster: Sign in + Request Access (xl+) + hamburger (< lg) */}
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onSignIn}
            className="inline-flex items-center justify-center rounded-full bg-[#071a2f] px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={onRequestAccess}
            className="hidden items-center justify-center rounded-full border border-[#d1dee3] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-700 transition hover:border-[#2f8094] hover:text-[#0a2036] xl:inline-flex"
          >
            Request Access
          </button>
          {/* Hamburger toggle — hidden at lg+ */}
          <button
            ref={hamburgerRef}
            type="button"
            onClick={() => setDrawerOpen((prev) => !prev)}
            aria-label={drawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={drawerOpen}
            aria-controls={drawerId}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d6e4e8] bg-white text-slate-600 transition hover:bg-[#eff6f8] lg:hidden"
          >
            {drawerOpen ? <CloseIcon /> : <HamburgerIcon />}
          </button>
        </div>
      </div>

      {/* Mobile / tablet slide-in drawer */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          />

          {/* Drawer panel */}
          <div
            id={drawerId}
            role="dialog"
            aria-label="Navigation menu"
            aria-modal="true"
            className="fixed inset-y-0 right-0 z-50 flex w-72 flex-col bg-white shadow-[0_0_40px_rgba(7,26,47,0.18)] lg:hidden"
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between border-b border-[#d6e4e8] px-6 py-4">
              <img
                src="/brand/texqtic-logo.png"
                alt="TexQtic"
                className="h-8 w-auto"
                loading="eager"
              />
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  hamburgerRef.current?.focus();
                }}
                aria-label="Close navigation menu"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d6e4e8] text-slate-600 transition hover:bg-[#eff6f8]"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Nav links */}
            <nav
              aria-label="Mobile navigation"
              className="flex-1 overflow-y-auto px-4 py-4"
            >
              <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                Discover
              </p>
              {NAV_LINKS.map(({ label, section }) => (
                <button
                  key={section}
                  type="button"
                  onClick={() => handleNavLink(section)}
                  aria-current={section === activeSection ? 'page' : undefined}
                  className={`mb-1 ${drawerLinkClass(section)}`}
                >
                  {label}
                </button>
              ))}
            </nav>

            {/* CTA cluster at drawer bottom */}
            <div className="flex flex-col gap-3 border-t border-[#d6e4e8] px-4 py-5">
              <button
                type="button"
                onClick={() => {
                  onSignIn();
                  setDrawerOpen(false);
                }}
                className="inline-flex w-full items-center justify-center rounded-full bg-[#071a2f] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-[#0d2743]"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  onRequestAccess();
                  setDrawerOpen(false);
                }}
                className="inline-flex w-full items-center justify-center rounded-full border border-[#d6e4e8] bg-white px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#2f8094] transition hover:bg-[#eff6f8]"
              >
                Request Access
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
