/**
 * ragEvaluationDataset.ts — G-028 A7: Benchmark query dataset
 *
 * Task ID: OPS-G028-A7-RETRIEVAL-QUALITY-LATENCY-BENCHMARK
 * Doctrine: v1.4 — evaluation-only; synthetic queries; no production data
 *
 * Defines the standard set of benchmark queries used to evaluate the RAG
 * retrieval pipeline. Each entry includes a query string and the set of
 * sourceType values and keyword signals expected to appear in relevant results.
 *
 * KNOWN LIMITATION:
 *   Dataset is synthetic. Relevance ground-truth is heuristic (keyword overlap +
 *   sourceType matching), not gold-label annotated. Results depend on ingestion
 *   coverage — if the corpus is empty, all precision scores will be 0.0.
 *
 * @module ragEvaluationDataset
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * A single benchmark query with associated relevance signals.
 *
 * `expectedSourceTypes`: source_table values that are plausibly relevant for
 *   this query (used in sourceType matching heuristic).
 *
 * `relevanceKeywords`: words that should appear in a truly relevant chunk
 *   (used in keyword overlap precision heuristic).
 */
export interface BenchmarkQuery {
  id: string;
  query: string;
  expectedSourceTypes: string[];
  relevanceKeywords: string[];
  domain: 'certification' | 'traceability' | 'catalog' | 'compliance' | 'supplier';
}

// ─── Dataset ──────────────────────────────────────────────────────────────────

/**
 * 20 benchmark queries spanning the core TexQtic domain verticals:
 * certification, traceability, catalog, compliance, and supplier management.
 *
 * These are deliberately broad (realistic user prompts), not anchored to
 * specific documents. The scorer rewards partial overlap to account for
 * the heuristic nature of relevance.
 */
export const RAG_BENCHMARK_QUERIES: BenchmarkQuery[] = [
  // ── Certification (4 queries) ──────────────────────────────────────────────
  {
    id: 'cert-001',
    query: 'cotton yarn certification requirements',
    expectedSourceTypes: ['certifications', 'catalog_items'],
    relevanceKeywords: ['certification', 'yarn', 'cotton', 'standard', 'compliance'],
    domain: 'certification',
  },
  {
    id: 'cert-002',
    query: 'organic certification expiry and renewal process',
    expectedSourceTypes: ['certifications'],
    relevanceKeywords: ['organic', 'expiry', 'renewal', 'certification', 'valid'],
    domain: 'certification',
  },
  {
    id: 'cert-003',
    query: 'GOTS certification for textile manufacturing',
    expectedSourceTypes: ['certifications', 'catalog_items'],
    relevanceKeywords: ['GOTS', 'textile', 'organic', 'certification', 'standard'],
    domain: 'certification',
  },
  {
    id: 'cert-004',
    query: 'fabric certification status and audit trail',
    expectedSourceTypes: ['certifications'],
    relevanceKeywords: ['fabric', 'certification', 'audit', 'status', 'verified'],
    domain: 'certification',
  },

  // ── Traceability (4 queries) ──────────────────────────────────────────────
  {
    id: 'trace-001',
    query: 'organic cotton traceability from farm to fabric',
    expectedSourceTypes: ['traceability_nodes', 'traceability_edges'],
    relevanceKeywords: ['traceability', 'organic', 'cotton', 'farm', 'supply chain'],
    domain: 'traceability',
  },
  {
    id: 'trace-002',
    query: 'supply chain node lineage and upstream provenance',
    expectedSourceTypes: ['traceability_nodes', 'traceability_edges'],
    relevanceKeywords: ['lineage', 'provenance', 'upstream', 'node', 'supply chain'],
    domain: 'traceability',
  },
  {
    id: 'trace-003',
    query: 'dyeing and finishing facility location and compliance',
    expectedSourceTypes: ['traceability_nodes'],
    relevanceKeywords: ['dyeing', 'finishing', 'facility', 'location', 'compliance'],
    domain: 'traceability',
  },
  {
    id: 'trace-004',
    query: 'DPP snapshot product identity and batch identifier',
    expectedSourceTypes: ['traceability_nodes', 'catalog_items'],
    relevanceKeywords: ['DPP', 'snapshot', 'batch', 'product', 'identity'],
    domain: 'traceability',
  },

  // ── Catalog (4 queries) ────────────────────────────────────────────────────
  {
    id: 'cat-001',
    query: 'fabric GSM standards and weight specifications',
    expectedSourceTypes: ['catalog_items'],
    relevanceKeywords: ['GSM', 'fabric', 'weight', 'specification', 'standard'],
    domain: 'catalog',
  },
  {
    id: 'cat-002',
    query: 'yarn count and tensile strength testing methods',
    expectedSourceTypes: ['catalog_items'],
    relevanceKeywords: ['yarn', 'count', 'tensile', 'strength', 'testing'],
    domain: 'catalog',
  },
  {
    id: 'cat-003',
    query: 'sustainable product material composition disclosure',
    expectedSourceTypes: ['catalog_items'],
    relevanceKeywords: ['sustainable', 'material', 'composition', 'disclosure', 'product'],
    domain: 'catalog',
  },
  {
    id: 'cat-004',
    query: 'raw material pricing and market benchmarks',
    expectedSourceTypes: ['catalog_items'],
    relevanceKeywords: ['pricing', 'raw material', 'market', 'benchmark', 'cost'],
    domain: 'catalog',
  },

  // ── Compliance (4 queries) ─────────────────────────────────────────────────
  {
    id: 'comp-001',
    query: 'supplier compliance verification checklist',
    expectedSourceTypes: ['certifications', 'traceability_nodes'],
    relevanceKeywords: ['compliance', 'verification', 'checklist', 'supplier', 'audit'],
    domain: 'compliance',
  },
  {
    id: 'comp-002',
    query: 'EU Digital Product Passport regulatory requirements',
    expectedSourceTypes: ['certifications', 'catalog_items'],
    relevanceKeywords: ['EU', 'DPP', 'regulation', 'requirement', 'digital passport'],
    domain: 'compliance',
  },
  {
    id: 'comp-003',
    query: 'restricted substances list and chemical compliance',
    expectedSourceTypes: ['certifications', 'catalog_items'],
    relevanceKeywords: ['restricted', 'substances', 'chemical', 'compliance', 'REACH'],
    domain: 'compliance',
  },
  {
    id: 'comp-004',
    query: 'carbon footprint and environmental impact reporting',
    expectedSourceTypes: ['certifications', 'traceability_nodes'],
    relevanceKeywords: ['carbon', 'footprint', 'environmental', 'impact', 'reporting'],
    domain: 'compliance',
  },

  // ── Supplier (4 queries) ───────────────────────────────────────────────────
  {
    id: 'supp-001',
    query: 'supplier profile and manufacturing capability overview',
    expectedSourceTypes: ['traceability_nodes'],
    relevanceKeywords: ['supplier', 'profile', 'manufacturing', 'capability', 'capacity'],
    domain: 'supplier',
  },
  {
    id: 'supp-002',
    query: 'vendor qualification and onboarding requirements',
    expectedSourceTypes: ['certifications', 'traceability_nodes'],
    relevanceKeywords: ['vendor', 'qualification', 'onboarding', 'requirement', 'audit'],
    domain: 'supplier',
  },
  {
    id: 'supp-003',
    query: 'fair trade and ethical sourcing certification',
    expectedSourceTypes: ['certifications'],
    relevanceKeywords: ['fair trade', 'ethical', 'sourcing', 'certification', 'standard'],
    domain: 'supplier',
  },
  {
    id: 'supp-004',
    query: 'minimum order quantity and lead time negotiation',
    expectedSourceTypes: ['catalog_items'],
    relevanceKeywords: ['minimum order', 'lead time', 'negotiation', 'quantity', 'MOQ'],
    domain: 'supplier',
  },
];

/** Total number of benchmark queries (must equal RAG_BENCHMARK_QUERIES.length). */
export const BENCHMARK_QUERY_COUNT = RAG_BENCHMARK_QUERIES.length;
