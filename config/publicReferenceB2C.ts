import type { PublicB2CProductCard, PublicB2CProductDetail } from '../services/publicB2CService';

export interface PublicReferenceB2CProductPreview {
  readonly slug: string;
  readonly key: string;
  readonly name: string;
  readonly imageUrl: string | null;
  readonly price: string | null;
  readonly moq: number | null;
  readonly category: string | null;
  readonly material: string | null;
  readonly fabricType: string | null;
  readonly supplierName: string;
  readonly supplierSlug: string;
  readonly jurisdiction: string;
  readonly isReferencePreview: true;
}

export type PublicReferenceB2CProductDetail = PublicB2CProductDetail & {
  readonly isReferencePreview: true;
};

type ReferenceProductSeed = {
  readonly slug: string;
  readonly name: string;
  readonly supplierName: string;
  readonly supplierSlug: string;
  readonly jurisdiction: string;
  readonly category: string;
  readonly material: string;
  readonly fabricType: string;
  readonly summary: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly relatedProductSlugs: readonly string[];
};

const PUBLIC_REFERENCE_B2C_PRODUCTS: readonly ReferenceProductSeed[] = [
  {
    slug: 'reference-cotton-percale-set',
    name: 'Reference Cotton Percale Set',
    supplierName: 'Reference Home Textiles Maker',
    supplierSlug: 'reference-home-textiles-maker',
    jurisdiction: 'Portugal',
    category: 'Home Textiles',
    material: 'Cotton',
    fabricType: 'Woven',
    summary: 'Reference preview of a home-textiles product page with public-safe storytelling only.',
    description:
      'This reference product preview illustrates how a home-textiles listing can present category context, material framing, and supplier attribution before a business publishes live product data on TexQtic.',
    tags: ['Home Textiles', 'Cotton', 'Woven'],
    relatedProductSlugs: ['reference-structured-weave-fabric'],
  },
  {
    slug: 'reference-structured-weave-fabric',
    name: 'Reference Structured Weave Fabric',
    supplierName: 'Reference Weaving Unit',
    supplierSlug: 'reference-weaving-unit',
    jurisdiction: 'India',
    category: 'Fabrics',
    material: 'Cotton',
    fabricType: 'Woven',
    summary: 'Reference preview of a fabric discovery card with material and supplier context.',
    description:
      'This reference fabric preview shows how TexQtic can frame product discovery around textile category, supplier context, and public-safe product storytelling without implying live inventory or transaction readiness.',
    tags: ['Fabrics', 'Cotton', 'Woven'],
    relatedProductSlugs: ['reference-cotton-percale-set', 'reference-lightweight-liner-textile'],
  },
  {
    slug: 'reference-utility-workwear-shell',
    name: 'Reference Utility Workwear Shell',
    supplierName: 'Reference Performance Textiles Studio',
    supplierSlug: 'reference-performance-textiles-studio',
    jurisdiction: 'Vietnam',
    category: 'Garments',
    material: 'Recycled blend',
    fabricType: 'Performance weave',
    summary: 'Reference preview of a garment launch surface with public-safe material context.',
    description:
      'This reference garment preview demonstrates how product cards and detail pages can present product storytelling, supplier context, and authenticated continuation pathways while genuine businesses are still onboarding.',
    tags: ['Garments', 'Recycled blend', 'Performance weave'],
    relatedProductSlugs: ['reference-lightweight-liner-textile'],
  },
  {
    slug: 'reference-lightweight-liner-textile',
    name: 'Reference Lightweight Liner Textile',
    supplierName: 'Reference Performance Textiles Studio',
    supplierSlug: 'reference-performance-textiles-studio',
    jurisdiction: 'Vietnam',
    category: 'Technical Textiles',
    material: 'Synthetic blend',
    fabricType: 'Engineered knit',
    summary: 'Reference preview of a technical-textiles discovery surface with bounded product context.',
    description:
      'This reference technical-textiles preview shows how a launch-preview product can explain category fit, supplier framing, and public-safe trust language without turning the page into a live marketplace offer.',
    tags: ['Technical Textiles', 'Synthetic blend', 'Engineered knit'],
    relatedProductSlugs: ['reference-utility-workwear-shell', 'reference-structured-weave-fabric'],
  },
] as const;

function toRelatedProductCard(slug: string): PublicB2CProductCard | null {
  const product = PUBLIC_REFERENCE_B2C_PRODUCTS.find((entry) => entry.slug === slug);
  if (!product) {
    return null;
  }

  return {
    slug: product.slug,
    name: product.name,
    imageUrl: null,
    price: null,
    category: product.category,
  };
}

export function getPublicReferenceB2CProductPreviews(): readonly PublicReferenceB2CProductPreview[] {
  return PUBLIC_REFERENCE_B2C_PRODUCTS.map((product) => ({
    slug: product.slug,
    key: `${product.supplierSlug}::${product.slug}`,
    name: product.name,
    imageUrl: null,
    price: null,
    moq: null,
    category: product.category,
    material: product.material,
    fabricType: product.fabricType,
    supplierName: product.supplierName,
    supplierSlug: product.supplierSlug,
    jurisdiction: product.jurisdiction,
    isReferencePreview: true,
  }));
}

export function getPublicReferenceB2CProductsByCategory(
  category: string,
): readonly PublicReferenceB2CProductPreview[] {
  return getPublicReferenceB2CProductPreviews().filter((product) => product.category === category);
}

export function getPublicReferenceB2CProductDetailBySlug(
  slug: string,
): PublicReferenceB2CProductDetail | undefined {
  const product = PUBLIC_REFERENCE_B2C_PRODUCTS.find((entry) => entry.slug === slug);
  if (!product) {
    return undefined;
  }

  const relatedProducts = product.relatedProductSlugs
    .map(toRelatedProductCard)
    .filter((entry): entry is PublicB2CProductCard => entry !== null);

  return {
    slug: product.slug,
    name: product.name,
    category: product.category,
    material: product.material,
    fabricType: product.fabricType,
    summary: product.summary,
    description: product.description,
    imageUrls: [],
    publicSupplierName: product.supplierName,
    publicSupplierSlug: product.supplierSlug,
    publicPriceLabel: null,
    publicMoqLabel: null,
    trustSignals: ['Reference product preview', 'Public-safe projection example'],
    hasTraceabilityEvidence: false,
    hasPassport: false,
    publicStatusLabel: 'Reference preview',
    tags: [...product.tags],
    relatedProducts,
    isReferencePreview: true,
  };
}