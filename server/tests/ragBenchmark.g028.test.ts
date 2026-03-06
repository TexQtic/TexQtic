/**
 * ragBenchmark.g028.test.ts — G-028 A7: RAG evaluation unit tests
 *
 * Task ID: OPS-G028-A7-RETRIEVAL-QUALITY-LATENCY-BENCHMARK
 * Doctrine: v1.4 — unit tests only; all deps mocked; no DB calls; no Gemini calls
 *
 * Test suites:
 *   A7-TEST-01 — Metrics timer (startTimer → recordTotalLatency)
 *   A7-TEST-02 — Scoring precision calculations
 *   A7-TEST-03 — Benchmark runner aggregation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  startTimer,
  markRetrievalStart,
  recordRetrievalLatency,
  markInferenceStart,
  recordInferenceLatency,
  recordTotalLatency,
  markEmbeddingStart,
  recordEmbeddingLatency,
  THRESHOLD_RETRIEVAL_MS,
  THRESHOLD_EMBEDDING_MS,
  THRESHOLD_TOTAL_MS,
  type RagMetricsHandle,
} from '../src/services/ai/ragMetrics.js';
import {
  scoreChunkRelevance,
  precisionAtK,
  recallAtK,
  scoreQueryResults,
  aggregateScores,
} from '../src/services/ai/ragScoring.js';
import type { BenchmarkQuery } from '../src/services/ai/ragEvaluationDataset.js';
import { RAG_BENCHMARK_QUERIES, BENCHMARK_QUERY_COUNT } from '../src/services/ai/ragEvaluationDataset.js';
import { runBenchmark } from '../src/services/ai/ragBenchmarkRunner.js';
import type { SimilarityResult } from '../src/lib/vectorStore.js';

// ─── Mock similarity results ──────────────────────────────────────────────────

function makeSimilarityResult(overrides: Partial<SimilarityResult> = {}): SimilarityResult {
  return {
    id: 'aaaa-bbbb',
    sourceId: 'src-001',
    sourceType: 'certifications',
    contentType: 'CERTIFICATION',
    content: 'organic cotton certification compliance standard',
    similarity: 0.88,
    chunkIndex: 0,
    ...overrides,
  };
}

function makeBenchmarkQuery(overrides: Partial<BenchmarkQuery> = {}): BenchmarkQuery {
  return {
    id: 'test-001',
    query: 'cotton yarn certification requirements',
    expectedSourceTypes: ['certifications', 'catalog_items'],
    relevanceKeywords: ['certification', 'cotton', 'standard', 'compliance'],
    domain: 'certification',
    ...overrides,
  };
}

// ─── Mock DB client ───────────────────────────────────────────────────────────

const mockDbClient = {} as Parameters<typeof runBenchmark>[0]['dbClient'];

// ─── Suite A7-TEST-01: Metrics Timer ─────────────────────────────────────────

describe('A7-TEST-01: ragMetrics — timer and snapshot', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  it('startTimer returns a handle with a numeric _startMs', () => {
    const before = Date.now();
    const handle = startTimer();
    const after = Date.now();
    expect(handle._startMs).toBeGreaterThanOrEqual(before);
    expect(handle._startMs).toBeLessThanOrEqual(after);
    expect(handle._retrievalMs).toBeNull();
    expect(handle._inferenceMs).toBeNull();
    expect(handle._embeddingMs).toBeNull();
    expect(handle._resultsCount).toBe(0);
    expect(handle._topScore).toBeNull();
  });

  it('recordTotalLatency returns a snapshot with a non-negative totalMs', () => {
    const handle = startTimer();
    const snapshot = recordTotalLatency(handle);
    expect(snapshot.totalMs).toBeGreaterThanOrEqual(0);
    expect(typeof snapshot.totalMs).toBe('number');
  });

  it('records retrieval latency and result metadata', () => {
    const handle = startTimer();
    markRetrievalStart(handle);
    recordRetrievalLatency(handle, 3, 0.91);
    const snapshot = recordTotalLatency(handle);
    expect(snapshot.retrievalMs).not.toBeNull();
    expect(snapshot.retrievalMs!).toBeGreaterThanOrEqual(0);
    expect(snapshot.resultsCount).toBe(3);
    expect(snapshot.topScore).toBe(0.91);
  });

  it('records inference latency', () => {
    const handle = startTimer();
    markInferenceStart(handle);
    recordInferenceLatency(handle);
    const snapshot = recordTotalLatency(handle);
    expect(snapshot.inferenceMs).not.toBeNull();
    expect(snapshot.inferenceMs!).toBeGreaterThanOrEqual(0);
  });

  it('records embedding latency', () => {
    const handle = startTimer();
    markEmbeddingStart(handle);
    recordEmbeddingLatency(handle);
    const snapshot = recordTotalLatency(handle);
    expect(snapshot.embeddingMs).not.toBeNull();
    expect(snapshot.embeddingMs!).toBeGreaterThanOrEqual(0);
  });

  it('thresholdDetail is null when metric not measured', () => {
    const handle = startTimer();
    const snapshot = recordTotalLatency(handle);
    expect(snapshot.thresholdDetail.retrievalPass).toBeNull();
    expect(snapshot.thresholdDetail.embeddingPass).toBeNull();
    // totalPass is always evaluated
    expect(typeof snapshot.thresholdDetail.totalPass).toBe('boolean');
  });

  it('exports correct threshold values', () => {
    expect(THRESHOLD_RETRIEVAL_MS).toBe(50);
    expect(THRESHOLD_EMBEDDING_MS).toBe(500);
    expect(THRESHOLD_TOTAL_MS).toBe(800);
  });

  it('thresholdPass is false when retrieval exceeds threshold', () => {
    const handle = startTimer();
    // Simulate slow retrieval by manually setting the internal value
    // (tested via recordRetrievalLatency with a manipulated start time)
    handle._retrievalMs = THRESHOLD_RETRIEVAL_MS + 1; // simulate over threshold
    const snapshot = recordTotalLatency(handle);
    expect(snapshot.thresholdDetail.retrievalPass).toBe(false);
    expect(snapshot.thresholdPass).toBe(false);
  });
});

// ─── Suite A7-TEST-02: Scoring precision calculations ─────────────────────────

describe('A7-TEST-02: ragScoring — precision and recall', () => {
  const query = makeBenchmarkQuery();

  it('scoreChunkRelevance: marks relevant when keyword overlap >= 0.2', () => {
    const result = makeSimilarityResult({
      content: 'organic cotton certification compliance standard', // 4/4 keywords
    });
    const relevance = scoreChunkRelevance(result, query);
    expect(relevance.isRelevant).toBe(true);
    expect(relevance.keywordOverlap).toBe(1.0);
  });

  it('scoreChunkRelevance: marks relevant when sourceType matches even with low keyword overlap', () => {
    const result = makeSimilarityResult({
      content: 'unrelated textile content with no matching terms',
      sourceType: 'certifications', // in expectedSourceTypes
    });
    const relevance = scoreChunkRelevance(result, query);
    expect(relevance.sourceTypeMatch).toBe(true);
    expect(relevance.isRelevant).toBe(true);
  });

  it('scoreChunkRelevance: marks not relevant when both keyword and sourceType miss', () => {
    const result = makeSimilarityResult({
      content: 'completely unrelated content about shipping logistics',
      sourceType: 'orders',
    });
    const relevance = scoreChunkRelevance(result, query);
    expect(relevance.isRelevant).toBe(false);
  });

  it('precisionAtK: computes precision@3 correctly', () => {
    const relevances = [
      { isRelevant: true, keywordOverlap: 0.8, sourceTypeMatch: true },   // 1
      { isRelevant: false, keywordOverlap: 0.1, sourceTypeMatch: false },  // 2
      { isRelevant: true, keywordOverlap: 0.5, sourceTypeMatch: false },   // 3
      { isRelevant: true, keywordOverlap: 0.9, sourceTypeMatch: true },    // 4 (excluded)
      { isRelevant: true, keywordOverlap: 0.7, sourceTypeMatch: false },   // 5 (excluded)
    ];
    // top 3: relevant=2, total=3 → 2/3 ≈ 0.667
    expect(precisionAtK(relevances, 3)).toBeCloseTo(2 / 3, 5);
  });

  it('precisionAtK: returns 0 for k=0', () => {
    const relevances = [{ isRelevant: true, keywordOverlap: 1.0, sourceTypeMatch: true }];
    expect(precisionAtK(relevances, 0)).toBe(0);
  });

  it('precisionAtK: returns 0 for empty array', () => {
    expect(precisionAtK([], 5)).toBe(0);
  });

  it('precisionAtK: precision@5 = 1.0 when all 5 are relevant', () => {
    const relevances = Array.from({ length: 5 }, () => ({
      isRelevant: true,
      keywordOverlap: 0.9,
      sourceTypeMatch: true,
    }));
    expect(precisionAtK(relevances, 5)).toBe(1.0);
  });

  it('recallAtK: computes recall correctly', () => {
    const results: SimilarityResult[] = [
      makeSimilarityResult({ sourceType: 'certifications' }),
      makeSimilarityResult({ sourceType: 'catalog_items' }),
      makeSimilarityResult({ sourceType: 'orders' }),
    ];
    const relevances = [
      { isRelevant: true, keywordOverlap: 0.8, sourceTypeMatch: true },  // certs covered
      { isRelevant: true, keywordOverlap: 0.5, sourceTypeMatch: true },  // catalog_items covered
      { isRelevant: false, keywordOverlap: 0.0, sourceTypeMatch: false }, // orders — not relevant
    ];
    // expected: ['certifications', 'catalog_items'] → 2 covered / 2 = 1.0
    const recall = recallAtK(results, relevances, query, 5);
    expect(recall).toBe(1.0);
  });

  it('scoreQueryResults: returns correct structure for empty results', () => {
    const result = scoreQueryResults(query, []);
    expect(result.queryId).toBe(query.id);
    expect(result.resultsCount).toBe(0);
    expect(result.precisionAt3).toBe(0);
    expect(result.precisionAt5).toBe(0);
    expect(result.recallAt5).toBe(0);
    expect(result.chunkRelevance).toHaveLength(0);
  });

  it('aggregateScores: computes correct averages', () => {
    const qr1 = {
      queryId: 'q1', query: 'a', resultsCount: 3,
      precisionAt3: 0.8, precisionAt5: 0.6, recallAt5: 0.5,
      chunkRelevance: [{ isRelevant: true, keywordOverlap: 0.8, sourceTypeMatch: true }],
    };
    const qr2 = {
      queryId: 'q2', query: 'b', resultsCount: 2,
      precisionAt3: 0.4, precisionAt5: 0.2, recallAt5: 0.3,
      chunkRelevance: [{ isRelevant: false, keywordOverlap: 0.1, sourceTypeMatch: false }],
    };
    const agg = aggregateScores([qr1, qr2]);
    expect(agg.queriesScored).toBe(2);
    expect(agg.avgPrecisionAt3).toBeCloseTo(0.6, 5);
    expect(agg.avgPrecisionAt5).toBeCloseTo(0.4, 5);
    expect(agg.avgRecallAt5).toBeCloseTo(0.4, 5);
    expect(agg.queriesWithAnyRelevantResult).toBe(1);
  });

  it('aggregateScores: handles empty input gracefully', () => {
    const agg = aggregateScores([]);
    expect(agg.queriesScored).toBe(0);
    expect(agg.avgPrecisionAt3).toBe(0);
  });
});

// ─── Suite A7-TEST-03: Benchmark runner ───────────────────────────────────────

describe('A7-TEST-03: ragBenchmarkRunner — aggregated metrics', () => {
  const fixedEmbedding = new Array(768).fill(0.1);

  // Mock embedding: returns instantly with a fixed 768-dim vector
  const mockGenerateEmbedding = vi.fn().mockResolvedValue(fixedEmbedding);

  // Mock querySimilar: returns 2 mocked results with decent similarity
  const mockQuerySimilar = vi.fn().mockResolvedValue([
    makeSimilarityResult({ similarity: 0.85, sourceType: 'certifications' }),
    makeSimilarityResult({ similarity: 0.72, sourceType: 'catalog_items' }),
  ]);

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateEmbedding.mockResolvedValue(fixedEmbedding);
    mockQuerySimilar.mockResolvedValue([
      makeSimilarityResult({ similarity: 0.85, sourceType: 'certifications' }),
      makeSimilarityResult({ similarity: 0.72, sourceType: 'catalog_items' }),
    ]);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  it('runner returns a BenchmarkReport with correct queriesTested', async () => {
    const query = makeBenchmarkQuery();
    const report = await runBenchmark({
      generateEmbedding: mockGenerateEmbedding,
      querySimilar: mockQuerySimilar,
      dbClient: mockDbClient,
      orgId: '00000000-0000-0000-0000-000000000001',
      queries: [query],
    });

    expect(report.queriesTested).toBe(1);
    expect(report.queriesErrored).toBe(0);
    expect(report.perQuery).toHaveLength(1);
  });

  it('runner aggregates latency correctly over multiple queries', async () => {
    const queries = [makeBenchmarkQuery(), makeBenchmarkQuery({ id: 'test-002', query: 'fabric gsm' })];
    const report = await runBenchmark({
      generateEmbedding: mockGenerateEmbedding,
      querySimilar: mockQuerySimilar,
      dbClient: mockDbClient,
      orgId: '00000000-0000-0000-0000-000000000001',
      queries,
    });

    expect(report.queriesTested).toBe(2);
    expect(report.latency.avgEmbeddingMs).toBeGreaterThanOrEqual(0);
    expect(report.latency.avgRetrievalMs).toBeGreaterThanOrEqual(0);
    expect(report.latency.avgTotalMs).toBeGreaterThanOrEqual(0);
  });

  it('runner records quality scores from scorer', async () => {
    const query = makeBenchmarkQuery();
    const report = await runBenchmark({
      generateEmbedding: mockGenerateEmbedding,
      querySimilar: mockQuerySimilar,
      dbClient: mockDbClient,
      orgId: '00000000-0000-0000-0000-000000000001',
      queries: [query],
    });

    // certifications is in expectedSourceTypes → at least 1 chunk is relevant
    expect(report.quality.avgPrecisionAt3).toBeGreaterThan(0);
    expect(report.quality.avgPrecisionAt5).toBeGreaterThan(0);
    expect(report.quality.queriesWithAnyRelevantResult).toBe(1);
  });

  it('runner handles embedding error gracefully and counts errored queries', async () => {
    mockGenerateEmbedding.mockRejectedValueOnce(new Error('Gemini timeout'));
    const query = makeBenchmarkQuery();
    const report = await runBenchmark({
      generateEmbedding: mockGenerateEmbedding,
      querySimilar: mockQuerySimilar,
      dbClient: mockDbClient,
      orgId: '00000000-0000-0000-0000-000000000001',
      queries: [query],
    });

    expect(report.queriesErrored).toBe(1);
    expect(report.perQuery[0]?.error).toContain('Gemini timeout');
    expect(report.perQuery[0]?.resultsCount).toBe(0);
  });

  it('runner returns thresholds structure with boolean flags', async () => {
    const report = await runBenchmark({
      generateEmbedding: mockGenerateEmbedding,
      querySimilar: mockQuerySimilar,
      dbClient: mockDbClient,
      orgId: '00000000-0000-0000-0000-000000000001',
      queries: [makeBenchmarkQuery()],
    });

    expect(typeof report.thresholds.retrievalPass).toBe('boolean');
    expect(typeof report.thresholds.embeddingPass).toBe('boolean');
    expect(typeof report.thresholds.totalPass).toBe('boolean');
    expect(typeof report.thresholds.overallPass).toBe('boolean');
    expect(report.thresholds.retrievalTarget).toBe(THRESHOLD_RETRIEVAL_MS);
    expect(report.thresholds.embeddingTarget).toBe(THRESHOLD_EMBEDDING_MS);
    expect(report.thresholds.totalTarget).toBe(THRESHOLD_TOTAL_MS);
  });

  it('benchmark dataset has at least 20 queries', () => {
    expect(RAG_BENCHMARK_QUERIES.length).toBeGreaterThanOrEqual(20);
    expect(BENCHMARK_QUERY_COUNT).toBe(RAG_BENCHMARK_QUERIES.length);
  });

  it('all benchmark queries have non-empty relevanceKeywords', () => {
    for (const q of RAG_BENCHMARK_QUERIES) {
      expect(q.relevanceKeywords.length).toBeGreaterThan(0);
      expect(q.expectedSourceTypes.length).toBeGreaterThan(0);
    }
  });
});
