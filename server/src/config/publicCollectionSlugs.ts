/**
 * Approved public collection slugs — server-side validation registry.
 *
 * Must stay in sync with config/publicCollectionsProjection.ts (frontend).
 * Do not add slugs without advancing PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001.
 *
 * Authority: PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001 §AF-003
 * Unit:      PUBLIC-INQUIRY-ENDPOINT-CONTEXT-IMPLEMENTATION-001
 */
export const APPROVED_COLLECTION_SLUGS: ReadonlySet<string> = new Set([
  'natural-fabric-stories',
  'garment-supply-chain-context',
  'home-textiles-showcase',
  'textile-services-ecosystem',
  'technical-textiles-context',
]);
