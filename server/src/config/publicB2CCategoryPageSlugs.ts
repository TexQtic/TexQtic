/**
 * Approved public B2C category page slugs — server-side validation registry.
 *
 * Must stay in sync with config/publicB2CCategoryPages.ts (frontend).
 * Do not add slugs without advancing B2C-PUBLIC-CATEGORY-STORY-PAGES-DESIGN-001.
 *
 * Authority: PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001 §AF-002
 * Unit:      PUBLIC-INQUIRY-ENDPOINT-CONTEXT-IMPLEMENTATION-001
 */
export const APPROVED_CATEGORY_SLUGS: ReadonlySet<string> = new Set([
  'garments',
  'home-textiles',
  'technical-textiles',
  'fabrics',
]);
