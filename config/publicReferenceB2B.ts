import type { PublicB2BSupplierProfile } from '../services/publicB2BService';

export type PublicReferenceB2BSupplier = PublicB2BSupplierProfile & {
  readonly isReferencePreview: true;
};

const PUBLIC_REFERENCE_B2B_SUPPLIERS: readonly PublicReferenceB2BSupplier[] = [
  {
    slug: 'reference-weaving-unit',
    legalName: 'Reference Weaving Unit',
    logoUrl: null,
    orgType: 'B2B',
    jurisdiction: 'India',
    certificationCount: 0,
    certificationTypes: [],
    hasTraceabilityEvidence: false,
    taxonomy: {
      primarySegment: 'Fabrics',
      secondarySegments: ['Fabric manufacturing', 'Finishing'],
      rolePositions: ['Weaving', 'Processing'],
    },
    offeringPreview: [
      { name: 'Reference structured weave program', moq: 0, imageUrl: '' },
      { name: 'Reference mill-finish library', moq: 0, imageUrl: '' },
    ],
    publicationPosture: 'B2B_PUBLIC',
    eligibilityPosture: 'PUBLICATION_ELIGIBLE',
    isReferencePreview: true,
  },
  {
    slug: 'reference-home-textiles-maker',
    legalName: 'Reference Home Textiles Maker',
    logoUrl: null,
    orgType: 'B2B',
    jurisdiction: 'Portugal',
    certificationCount: 0,
    certificationTypes: [],
    hasTraceabilityEvidence: false,
    taxonomy: {
      primarySegment: 'Home Textiles',
      secondarySegments: ['Home textile products', 'Soft furnishings'],
      rolePositions: ['Product development', 'Private label support'],
    },
    offeringPreview: [
      { name: 'Reference bedding assortment', moq: 0, imageUrl: '' },
      { name: 'Reference towel program', moq: 0, imageUrl: '' },
    ],
    publicationPosture: 'B2B_PUBLIC',
    eligibilityPosture: 'PUBLICATION_ELIGIBLE',
    isReferencePreview: true,
  },
  {
    slug: 'reference-performance-textiles-studio',
    legalName: 'Reference Performance Textiles Studio',
    logoUrl: null,
    orgType: 'B2B',
    jurisdiction: 'Vietnam',
    certificationCount: 0,
    certificationTypes: [],
    hasTraceabilityEvidence: false,
    taxonomy: {
      primarySegment: 'Technical Textiles',
      secondarySegments: ['Garments', 'Technical textile products'],
      rolePositions: ['Material development', 'Garment engineering'],
    },
    offeringPreview: [
      { name: 'Reference performance shell concept', moq: 0, imageUrl: '' },
      { name: 'Reference liner textile concept', moq: 0, imageUrl: '' },
    ],
    publicationPosture: 'B2B_PUBLIC',
    eligibilityPosture: 'PUBLICATION_ELIGIBLE',
    isReferencePreview: true,
  },
] as const;

export function getPublicReferenceB2BSuppliers(): readonly PublicReferenceB2BSupplier[] {
  return PUBLIC_REFERENCE_B2B_SUPPLIERS;
}

export function getPublicReferenceB2BSupplierBySlug(
  slug: string,
): PublicReferenceB2BSupplier | undefined {
  return PUBLIC_REFERENCE_B2B_SUPPLIERS.find((supplier) => supplier.slug === slug);
}