/**
 * Public Page Metadata Utility — Stage 2
 *
 * Authority:  PUBLIC-SEO-INFRASTRUCTURE-DECISION-001 (Option E: repo-local DOM utility)
 *             D2C-COLLECTION-SEO-GOVERNANCE-001
 *             PUBLIC-SEO-JSONLD-WEBTYPE-IMPLEMENTATION-001
 *
 * Purpose:
 *   Manages SEO <head> metadata (title, description, canonical, robots, Open Graph,
 *   Twitter Card, JSON-LD structured data) for D2C public surfaces only.
 *
 * Design:
 *   - No external dependency. Direct DOM manipulation via document APIs.
 *   - Managed meta/link tags are marked with data-texqtic-public-meta="true".
 *   - Managed JSON-LD scripts are marked with data-texqtic-public-jsonld="true".
 *   - Idempotent: safe to call on every render cycle.
 *   - Fail-closed: browser guard prevents execution outside browser context.
 *
 * Stage 1 scope:
 *   - PUBLIC_COLLECTIONS list surface
 *   - PUBLIC_COLLECTION_DETAIL surface
 *   - PUBLIC_COLLECTION_DETAIL_UNAVAILABLE surface
 *   - PUBLIC_B2C_CATEGORY_STORY surface (B2C-PUBLIC-CATEGORY-STORY-PAGES-IMPLEMENTATION-001)
 *
 * Stage 2 additions (PUBLIC-SEO-JSONLD-WEBTYPE-IMPLEMENTATION-001):
 *   - JSON-LD structured data: WebPage, CollectionPage, BreadcrumbList
 *   - Optional jsonLd field on PublicPageMetaInput
 *   - Managed JSON-LD scripts (data-texqtic-public-jsonld="true")
 *   - Allowed schema.org types: WebPage, CollectionPage, BreadcrumbList, WebSite, ListItem
 *   - Forbidden schema.org types: Product, Offer, AggregateRating, Review, Organization,
 *     FAQPage, ContactPage (governance: D2C-COLLECTION-SEO-GOVERNANCE-001 §9)
 *
 * Deferred (out of current scope):
 *   - XML sitemap generation
 *   - robots.txt management
 *   - SSR/SSG/prerendering
 *   - Per-collection hero image in og:image (deferred until image management approved)
 *
 * Governance rules applied:
 *   - D2C-COLLECTION-SEO-GOVERNANCE-001 §4: field rules per tag type
 *   - D2C-COLLECTION-SEO-GOVERNANCE-001 §9: forbidden metadata
 *   - D2C-COLLECTION-SEO-GOVERNANCE-001 §11: alt text and safe copy
 *   - No private IDs, org IDs, tenant IDs, auth tokens, pricing, inventory,
 *     or unverified trust/certification claims in any metadata field.
 */

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/** Attribute that marks all meta/link tags managed by this utility for targeted cleanup. */
const MANAGED_ATTR = 'data-texqtic-public-meta';

/** Attribute that marks JSON-LD <script> tags managed by this utility. */
const JSONLD_MANAGED_ATTR = 'data-texqtic-public-jsonld';

/**
 * Find or create a <meta> tag identified by `identAttr`=`identValue` and
 * the managed-attribute marker. Sets `contentAttr` to `contentValue`.
 */
function setOrCreateMeta(
  identAttr: string,
  identValue: string,
  contentAttr: string,
  contentValue: string,
): void {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${identAttr}="${identValue}"][${MANAGED_ATTR}]`,
  );
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(identAttr, identValue);
    el.setAttribute(MANAGED_ATTR, 'true');
    document.head.appendChild(el);
  }
  el.setAttribute(contentAttr, contentValue);
}

/**
 * Find or create a <link> tag identified by `rel` and the managed-attribute
 * marker. Sets `href` to `hrefValue`.
 */
function setOrCreateLink(rel: string, hrefValue: string): void {
  let el = document.head.querySelector<HTMLLinkElement>(
    `link[rel="${rel}"][${MANAGED_ATTR}]`,
  );
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    el.setAttribute(MANAGED_ATTR, 'true');
    document.head.appendChild(el);
  }
  el.setAttribute('href', hrefValue);
}

/** Remove all managed JSON-LD <script> tags from document.head. */
function clearManagedJsonLd(): void {
  document.head
    .querySelectorAll(`script[${JSONLD_MANAGED_ATTR}]`)
    .forEach((el) => el.remove());
}

// ---------------------------------------------------------------------------
// Public API — Types
// ---------------------------------------------------------------------------

/**
 * A flexible JSON-LD structured data block. Use only schema.org-approved types.
 * Caller is responsible for governance compliance (see file header for allowed types).
 * Serialised with JSON.stringify — all values must be JSON-serialisable.
 */
export type PublicJsonLdBlock = Record<string, unknown>;

/**
 * Input shape for applyPublicPageMeta.
 * All meta/link fields are required; jsonLd is optional.
 * Caller must supply safe, governance-compliant values for all fields.
 */
export interface PublicPageMetaInput {
  /** Page title. Written to document.title and the managed <title>-level title. */
  readonly title: string;
  /** <meta name="description"> content. Max ~160 chars. */
  readonly description: string;
  /** <link rel="canonical"> href. Must be an absolute URL with origin. */
  readonly canonical: string;
  /** <meta name="robots"> content. */
  readonly robots: 'index, follow' | 'noindex, nofollow';
  /** <meta property="og:title"> content. */
  readonly ogTitle: string;
  /** <meta property="og:description"> content. */
  readonly ogDescription: string;
  /** <meta property="og:image"> content. Empty string if no image available. */
  readonly ogImage: string;
  /** <meta property="og:url"> content. Canonical URL. */
  readonly ogUrl: string;
  /** <meta property="og:type"> content. */
  readonly ogType: 'website';
  /** <meta name="twitter:card"> content. */
  readonly twitterCard: 'summary_large_image' | 'summary';
  /** <meta name="twitter:title"> content. */
  readonly twitterTitle: string;
  /** <meta name="twitter:description"> content. */
  readonly twitterDescription: string;
  /** <meta name="twitter:image"> content. Empty string if no image available. */
  readonly twitterImage: string;
  /**
   * Optional JSON-LD structured data blocks.
   * When provided, injected as managed <script type="application/ld+json"> tags.
   * When absent or empty, any prior managed JSON-LD scripts are cleared.
   * Allowed types: WebPage, CollectionPage, BreadcrumbList, WebSite, ListItem.
   * Forbidden types: Product, Offer, AggregateRating, Review, Organization, FAQPage, ContactPage.
   */
  readonly jsonLd?: readonly PublicJsonLdBlock[];
}

// ---------------------------------------------------------------------------
// Public API — Constants
// ---------------------------------------------------------------------------

/**
 * Platform-level OG/Twitter fallback image path.
 *
 * Stage 1: Uses the brand logo as a safe platform-level fallback.
 * Asset: public/brand/texqtic-logo.png — served by Vite at /brand/texqtic-logo.png.
 *
 * Deferred: A dedicated 1200×630 OG image asset is not yet established.
 * Governance: D2C-COLLECTION-SEO-GOVERNANCE-001 §4.6 Governance Unit 5/13
 * defers the exact OG image strategy to when image management is established.
 * Update this constant when a dedicated platform-level OG image is approved.
 */
export const PUBLIC_META_OG_FALLBACK_IMAGE = '/brand/texqtic-logo.png';

// ---------------------------------------------------------------------------
// Public API — Functions
// ---------------------------------------------------------------------------

/**
 * Apply SEO metadata to the document <head> for a public collection surface.
 *
 * Safe to call on every render cycle — idempotently sets/updates managed tags.
 * Only operates in browser context (no-op if `document` is unavailable).
 *
 * Managed tags (all marked with data-texqtic-public-meta="true"):
 *   <meta name="description">
 *   <link rel="canonical">
 *   <meta name="robots">
 *   <meta property="og:title">
 *   <meta property="og:description">
 *   <meta property="og:image">
 *   <meta property="og:url">
 *   <meta property="og:type">
 *   <meta name="twitter:card">
 *   <meta name="twitter:title">
 *   <meta name="twitter:description">
 *   <meta name="twitter:image">
 *
 * document.title is also set directly (not via a managed tag).
 */
export function applyPublicPageMeta(input: PublicPageMetaInput): void {
  if (typeof document === 'undefined') return;

  // Page title (document.title — not a managed tag; App.tsx also manages this)
  document.title = input.title;

  // <meta name="description">
  setOrCreateMeta('name', 'description', 'content', input.description);

  // <link rel="canonical">
  setOrCreateLink('canonical', input.canonical);

  // <meta name="robots">
  setOrCreateMeta('name', 'robots', 'content', input.robots);

  // Open Graph
  setOrCreateMeta('property', 'og:title', 'content', input.ogTitle);
  setOrCreateMeta('property', 'og:description', 'content', input.ogDescription);
  setOrCreateMeta('property', 'og:image', 'content', input.ogImage);
  setOrCreateMeta('property', 'og:url', 'content', input.ogUrl);
  setOrCreateMeta('property', 'og:type', 'content', input.ogType);

  // Twitter Card
  setOrCreateMeta('name', 'twitter:card', 'content', input.twitterCard);
  setOrCreateMeta('name', 'twitter:title', 'content', input.twitterTitle);
  setOrCreateMeta('name', 'twitter:description', 'content', input.twitterDescription);
  setOrCreateMeta('name', 'twitter:image', 'content', input.twitterImage);

  // JSON-LD structured data: always clear prior managed scripts, then inject new if provided
  clearManagedJsonLd();
  if (input.jsonLd) {
    for (const block of input.jsonLd) {
      const script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute(JSONLD_MANAGED_ATTR, 'true');
      script.textContent = JSON.stringify(block);
      document.head.appendChild(script);
    }
  }
}

/**
 * Remove all managed <head> metadata tags created by applyPublicPageMeta.
 *
 * Call when navigating away from public collection surfaces so managed tags
 * do not persist across unrelated app states.
 *
 * Does NOT reset document.title — the existing App.tsx documentTitle mechanism
 * manages the title for non-collection states.
 *
 * Only operates in browser context (no-op if `document` is unavailable).
 */
export function clearPublicPageMeta(): void {
  if (typeof document === 'undefined') return;
  document.head
    .querySelectorAll(`[${MANAGED_ATTR}]`)
    .forEach((el) => el.remove());
  clearManagedJsonLd();
}
