/**
 * B2C Public Category Pages — Static Config
 *
 * Authority:  B2C-PUBLIC-CATEGORY-STORY-PAGES-DESIGN-001
 * Created:    2026-07-27
 *
 * PURPOSE
 * -------
 * Static configuration for URL-addressable B2C category story pages at
 * /products/category/:slug. Defines the approved initial category set,
 * educational copy, and SEO metadata for each category page.
 *
 * GOVERNANCE RULES
 * ----------------
 * - All copy must comply with INDUSTRY-CLUSTER-TAXONOMY-DECISION-001 §6
 *   (Allowed Public Claims) and §8 (Forbidden Claims).
 * - `segment` must reference an existing IndustrySegment value. Do not add
 *   new terms without advancing INDUSTRY-CLUSTER-TAXONOMY-DECISION-001 to
 *   ACCEPTED.
 * - No evidence-gated claims. No universal DPP/passport/trust/certification
 *   claims.
 * - No private identifiers, pricing, inventory, or buyer-intent language.
 *
 * Initial category set:
 *   Garments, Home Textiles, Technical Textiles, Fabrics
 *
 * Deferred:
 *   Yarn & Spinning (B2B-oriented; limited B2C consumer narrative at this
 *     stage)
 *   Textile Services (service category, not a product category)
 */

import { type IndustrySegment } from './publicIndustryClusterTaxonomy';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PublicB2CCategoryPageConfig {
  /** IndustrySegment value — must exist in INDUSTRY_SEGMENTS. */
  readonly segment: IndustrySegment;
  /** URL slug for /products/category/:slug. Kebab-case. */
  readonly slug: string;
  /** Hero heading (category name). */
  readonly heroHeading: string;
  /** Hero tagline — one sentence, PUBLIC_SAFE. */
  readonly heroTagline: string;
  /** Hero description — 2-3 sentences, PUBLIC_SAFE. */
  readonly heroDescription: string;
  /** Optional context band copy — deeper category context, PUBLIC_SAFE. */
  readonly contextBandCopy?: string;
  /** document.title / og:title value. */
  readonly seoTitle: string;
  /** <meta name="description"> value. ~160 chars max. */
  readonly seoDescription: string;
  /** <link rel="canonical"> path component (no origin). */
  readonly canonicalPath: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const B2C_CATEGORY_PAGE_CONFIGS: readonly PublicB2CCategoryPageConfig[] = [
  {
    segment: 'Garments',
    slug: 'garments',
    heroHeading: 'Garments',
    heroTagline: 'Consumer-facing textile products for everyday and specialised use.',
    heroDescription:
      'Garments represent the consumer-facing stage of the textile value chain. Browse public-safe product previews for finished garments across a range of uses, materials, and manufacturing pathways.',
    contextBandCopy:
      'The garments category includes finished clothing and wearable textile products. From everyday casual wear to technical performance garments, this category spans a wide range of end-use applications across global textile supply chains.',
    seoTitle: 'Garments — Browse Textile Products | TexQtic',
    seoDescription:
      'Explore public-safe garment product previews on TexQtic. Discover finished garments across materials, styles, and supply chain pathways.',
    canonicalPath: '/products/category/garments',
  },
  {
    segment: 'Home Textiles',
    slug: 'home-textiles',
    heroHeading: 'Home Textiles',
    heroTagline: 'Textile products designed for residential and institutional living spaces.',
    heroDescription:
      'Home Textiles serve residential and institutional end-use markets. Browse public-safe product previews for bed linen, curtains, upholstery, towelling, and other home textile applications.',
    contextBandCopy:
      'The home textiles category covers a wide spectrum of soft furnishing and functional textile products used in homes, hospitality, and institutional settings. Products range from bedding and towelling to decorative and technical interior textiles.',
    seoTitle: 'Home Textiles — Browse Textile Products | TexQtic',
    seoDescription:
      'Explore public-safe home textile product previews on TexQtic. Discover bed linen, towelling, curtains, and more across the textile supply chain.',
    canonicalPath: '/products/category/home-textiles',
  },
  {
    segment: 'Technical Textiles',
    slug: 'technical-textiles',
    heroHeading: 'Technical Textiles',
    heroTagline: 'Textile products engineered for performance and specialised applications.',
    heroDescription:
      'Technical Textiles serve specialised applications beyond conventional end-use. Browse public-safe product previews for performance and functional textile products designed for industrial, medical, safety, and advanced-use pathways.',
    contextBandCopy:
      'Technical textiles are engineered textile products designed for specific functional properties rather than aesthetic appeal alone. They serve applications across industrial, safety, medical, and advanced materials domains — representing the performance end of the textile value chain.',
    seoTitle: 'Technical Textiles — Browse Textile Products | TexQtic',
    seoDescription:
      'Explore public-safe technical textile product previews on TexQtic. Discover functional and performance textiles across industrial and advanced-use pathways.',
    canonicalPath: '/products/category/technical-textiles',
  },
  {
    segment: 'Fabrics',
    slug: 'fabrics',
    heroHeading: 'Fabrics',
    heroTagline: 'The material foundation connecting raw inputs to finished textile pathways.',
    heroDescription:
      'Fabrics connect raw material inputs to finished textile products. Browse public-safe product previews for woven, knit, and processed fabric products across a range of compositions, constructions, and applications.',
    contextBandCopy:
      'The fabrics category bridges raw material production and finished product manufacturing in the textile value chain. It includes woven and knit constructions, processed and treated fabrics, and specialised material compositions used across garment, home textile, and technical textile pathways.',
    seoTitle: 'Fabrics — Browse Textile Products | TexQtic',
    seoDescription:
      'Explore public-safe fabric product previews on TexQtic. Discover woven, knit, and processed fabrics across material compositions and textile applications.',
    canonicalPath: '/products/category/fabrics',
  },
];

// ---------------------------------------------------------------------------
// Lookup Helpers
// ---------------------------------------------------------------------------

/**
 * Look up a category page config by URL slug.
 * Returns undefined for unknown slugs.
 */
export function getCategoryPageBySlug(
  slug: string,
): PublicB2CCategoryPageConfig | undefined {
  return B2C_CATEGORY_PAGE_CONFIGS.find((c) => c.slug === slug);
}

/**
 * Look up a category page config by IndustrySegment.
 * Returns undefined for unregistered segments.
 */
export function getCategoryPageBySegment(
  segment: IndustrySegment,
): PublicB2CCategoryPageConfig | undefined {
  return B2C_CATEGORY_PAGE_CONFIGS.find((c) => c.segment === segment);
}
