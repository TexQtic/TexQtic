/**
 * Public Collections Projection — Static Config
 *
 * Authority:  PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001
 *             D2C-COLLECTIONS-DATA-MODEL-DESIGN-001
 *             D2C-ORIGIN-STORYTELLING-GOVERNANCE-001
 *             D2C-EARLY-ACCESS-AUTH-HANDOFF-DESIGN-001
 *             D2C-COLLECTION-SEO-GOVERNANCE-001
 *             INDUSTRY-CLUSTER-TAXONOMY-DECISION-001
 *
 * Purpose:
 *   Frontend-only static projection dataset for the /collections public
 *   attraction surface. No backend endpoint, schema, migration, OpenAPI, or
 *   API contract exists for public collections in this phase.
 *
 * Governance rules:
 *   - All fields here are PUBLIC_SAFE (see Field Classification below).
 *   - No private IDs, org IDs, tenant IDs, or internal linkage IDs.
 *   - No commerce, checkout, cart, wishlist, order, RFQ, or buyer-intent fields.
 *   - No collection-owned passport fields (deferred).
 *   - No universal trust/passport/certification/origin/traceability claims.
 *   - No "drops" terminology.
 *   - No ranking, recommendation, score, or AI/Aggregator-intelligence fields.
 *   - Trust context is fail-closed (collectionHasTrustContext: false by default).
 *   - Taxonomy tags must match approved values from publicIndustryClusterTaxonomy.ts.
 *   - Category/material/segment strings are drawn from approved taxonomy config.
 *
 * Phase status:
 *   - This is a static-config-backed projection.
 *   - When a live backend collection API is approved and built, this config will
 *     be superseded by a runtime projection service.
 *
 * Allowable future expansion (with governance approval):
 *   - supplierContextLabel (EVIDENCE_GATED)
 *   - trustLabel with conditionality (EVIDENCE_GATED)
 *   - eligibleProductPreview count (EVIDENCE_GATED, static or API-backed)
 *
 * Blocked until separate approved units:
 *   - collection-owned passport fields
 *   - /collections/:slug detail projection
 *   - authenticated continuation deep-link behavior
 */

// ---------------------------------------------------------------------------
// Field Types
// ---------------------------------------------------------------------------

/** Availability state for a collection in the list. */
export type CollectionAvailability = 'AVAILABLE' | 'COMING_SOON';

/** Story type classification for a collection. Matches D2C semantics decision. */
export type CollectionStoryType =
  | 'MATERIAL_STORY'
  | 'ORIGIN_STORY'
  | 'PROCESS_STORY'
  | 'CATEGORY_SHOWCASE'
  | 'ECOSYSTEM_SHOWCASE';

/**
 * CTA action token for authenticated continuation.
 * Must not be transactional; no checkout/cart/RFQ/buyer-intent semantics.
 */
export type CtaAction = 'AUTH_CONTINUE';

/** Single public-safe authenticated continuation CTA metadata. */
export interface PublicCollectionCta {
  readonly label: string;
  /** Always 'AUTH_CONTINUE' — non-transactional attraction CTA only. */
  readonly action: CtaAction;
  /** Conceptual auth target; actual entry is modal via openSecondaryAuthenticatedEntry. */
  readonly intent: 'COLLECTION_CONTINUATION';
}

/** Public-safe list state for a single collection record. */
export interface PublicCollectionListState {
  readonly availability: CollectionAvailability;
  /** Safe fallback label for coming-soon or gated records. No internal gate reasons. */
  readonly fallbackLabel: string | null;
}

/**
 * Public-safe projection shape for a single collection in the list.
 *
 * Field classification:
 *   PUBLIC_SAFE:    publicSlug, title, summary, heroAlt, categoryTags,
 *                   materialTags, segmentTags, collectionStoryType,
 *                   curatedContextLabel, cta, listState
 *   FAIL_CLOSED:    collectionHasTrustContext (always false in this phase)
 *   OMITTED:        heroImage URL (no public image hosting in this phase;
 *                   hero is rendered as visual placeholder)
 *   DEFERRED:       trustLabel, supplierContextLabel, eligibleProductPreview,
 *                   collection-owned passport fields
 *   FORBIDDEN:      private IDs, org IDs, tenant IDs, internal linkage IDs,
 *                   checkout/cart/wishlist/order/RFQ/buyer-intent fields,
 *                   universal trust/passport/certification/traceability claims,
 *                   ranking/recommendation/score/AI/Aggregator-intelligence fields,
 *                   "drops" terminology
 */
export interface PublicCollectionProjection {
  /** Public-safe slug for routing. Safe format: [a-z0-9-]+. */
  readonly publicSlug: string;
  /** Display title. Safe copy; no unsupported origin/certification/sustainability claims. */
  readonly title: string;
  /** Short description. Public-safe editorial summary only. */
  readonly summary: string;
  /** Alt text for hero visual placeholder. No evidence-backed claims. */
  readonly heroAlt: string;
  /** Approved product category tags. Values from PRODUCT_CATEGORIES in taxonomy config. */
  readonly categoryTags: readonly string[];
  /** Approved material tags. Values from MATERIAL_TYPES in taxonomy config. */
  readonly materialTags: readonly string[];
  /** Approved segment tags. Values from INDUSTRY_SEGMENTS in taxonomy config. */
  readonly segmentTags: readonly string[];
  /** Story type classification. */
  readonly collectionStoryType: CollectionStoryType;
  /** Short public label for the collection framing context. */
  readonly curatedContextLabel: string;
  /**
   * Fail-closed trust context flag.
   * Must be false in this static-config phase; no live trust backing exists.
   * Evidence-gated: requires live API projection + publication gate approval to set true.
   */
  readonly collectionHasTrustContext: false;
  /** Non-transactional authenticated continuation CTA. */
  readonly cta: PublicCollectionCta;
  /** Availability and fallback state. */
  readonly listState: PublicCollectionListState;
}

// ---------------------------------------------------------------------------
// Static Public-Safe Collection Projections
//
// GOVERNANCE NOTE: All copy here is public-safe editorial/conceptual framing.
// - No specific supplier identity, private contact, pricing, inventory, or
//   private workflow detail is included.
// - No origin, certification, sustainability, artisan, traceability, or DPP
//   claims beyond approved taxonomy labels.
// - No "drops", ranking, recommendation, score, AI, or Aggregator language.
// - No collection-owned passport status or universal trust claims.
// - Trust context is fail-closed (collectionHasTrustContext: false).
// ---------------------------------------------------------------------------

export const PUBLIC_COLLECTION_PROJECTIONS: readonly PublicCollectionProjection[] = [
  {
    publicSlug: 'natural-fabric-stories',
    title: 'Natural Fabric Stories',
    summary:
      'A curated public showcase of textile stories centred on natural fabrics — cotton, wool, linen, and silk — framed through supply-chain context and ecosystem positioning.',
    heroAlt: 'Natural fabric textile showcase',
    categoryTags: ['Fabric products'],
    materialTags: ['Cotton', 'Wool', 'Linen', 'Silk'],
    segmentTags: ['Fabrics'],
    collectionStoryType: 'MATERIAL_STORY',
    curatedContextLabel: 'Material showcase',
    collectionHasTrustContext: false,
    cta: {
      label: 'Continue after sign in',
      action: 'AUTH_CONTINUE',
      intent: 'COLLECTION_CONTINUATION',
    },
    listState: {
      availability: 'AVAILABLE',
      fallbackLabel: null,
    },
  },
  {
    publicSlug: 'garment-supply-chain-context',
    title: 'Garment Supply Chain Context',
    summary:
      'Public-safe ecosystem framing for finished garment supply chains — from yarn and fabric through to garment manufacturing context — without exposing private supplier or buyer records.',
    heroAlt: 'Garment supply chain context showcase',
    categoryTags: ['Finished garments', 'Fabric products', 'Yarn products'],
    materialTags: ['Cotton', 'Polyester', 'Blended materials'],
    segmentTags: ['Garments', 'Fabrics', 'Yarn & Spinning'],
    collectionStoryType: 'PROCESS_STORY',
    curatedContextLabel: 'Supply chain showcase',
    collectionHasTrustContext: false,
    cta: {
      label: 'Continue after sign in',
      action: 'AUTH_CONTINUE',
      intent: 'COLLECTION_CONTINUATION',
    },
    listState: {
      availability: 'AVAILABLE',
      fallbackLabel: null,
    },
  },
  {
    publicSlug: 'home-textiles-showcase',
    title: 'Home Textiles Showcase',
    summary:
      'A public-safe showcase of home textile product categories and the ecosystem participants — weavers, dyers, finishers, and manufacturers — that support this segment.',
    heroAlt: 'Home textiles showcase',
    categoryTags: ['Home textile products'],
    materialTags: ['Cotton', 'Linen', 'Blended materials'],
    segmentTags: ['Home Textiles'],
    collectionStoryType: 'CATEGORY_SHOWCASE',
    curatedContextLabel: 'Category showcase',
    collectionHasTrustContext: false,
    cta: {
      label: 'Continue after sign in',
      action: 'AUTH_CONTINUE',
      intent: 'COLLECTION_CONTINUATION',
    },
    listState: {
      availability: 'AVAILABLE',
      fallbackLabel: null,
    },
  },
  {
    publicSlug: 'textile-services-ecosystem',
    title: 'Textile Services Ecosystem',
    summary:
      'Public framing of the supporting service layer in textile ecosystems — testing, consulting, logistics, and other service roles that operate across segments.',
    heroAlt: 'Textile services ecosystem context',
    categoryTags: ['Textile services'],
    materialTags: [],
    segmentTags: ['Textile Services'],
    collectionStoryType: 'ECOSYSTEM_SHOWCASE',
    curatedContextLabel: 'Ecosystem context',
    collectionHasTrustContext: false,
    cta: {
      label: 'Continue after sign in',
      action: 'AUTH_CONTINUE',
      intent: 'COLLECTION_CONTINUATION',
    },
    listState: {
      availability: 'AVAILABLE',
      fallbackLabel: null,
    },
  },
  {
    publicSlug: 'technical-textiles-context',
    title: 'Technical Textiles Context',
    summary:
      'Broad public-safe ecosystem framing for technical textile product categories — synthetic fibers, engineered materials, and the specialized manufacturing context around them.',
    heroAlt: 'Technical textiles ecosystem context',
    categoryTags: ['Technical textile products'],
    materialTags: ['Synthetic fibers', 'Polyester', 'Blended materials'],
    segmentTags: ['Technical Textiles'],
    collectionStoryType: 'CATEGORY_SHOWCASE',
    curatedContextLabel: 'Category showcase',
    collectionHasTrustContext: false,
    cta: {
      label: 'Continue after sign in',
      action: 'AUTH_CONTINUE',
      intent: 'COLLECTION_CONTINUATION',
    },
    listState: {
      availability: 'AVAILABLE',
      fallbackLabel: null,
    },
  },
] as const;

// ---------------------------------------------------------------------------
// List Meta
// ---------------------------------------------------------------------------

/** Public-safe list meta for the /collections surface. */
export interface PublicCollectionsListMeta {
  /** True if the projection has no eligible records to display. */
  readonly emptyState: boolean;
  /** Safe fallback mode label if data is unavailable. No diagnostic details. */
  readonly fallbackMode: 'NONE' | 'STATIC_CONFIG' | 'EMPTY';
}

/** Derive list meta from a projection array. */
export function deriveCollectionsListMeta(
  projections: readonly PublicCollectionProjection[],
): PublicCollectionsListMeta {
  const eligible = projections.filter(
    (c) => c.listState.availability === 'AVAILABLE',
  );
  if (eligible.length === 0) {
    return { emptyState: true, fallbackMode: 'EMPTY' };
  }
  return { emptyState: false, fallbackMode: 'STATIC_CONFIG' };
}

/** Return only AVAILABLE projections. Fail-closed omit for anything else. */
export function getEligibleCollections(
  projections: readonly PublicCollectionProjection[],
): readonly PublicCollectionProjection[] {
  return projections.filter((c) => c.listState.availability === 'AVAILABLE');
}
