/**
 * ragScoring.ts — G-028 A7: Retrieval quality scoring
 *
 * Task ID: OPS-G028-A7-RETRIEVAL-QUALITY-LATENCY-BENCHMARK
 * Doctrine: v1.4 — evaluation-only; heuristic scoring; no production behavior change
 *
 * Computes retrieval relevance metrics using two lightweight heuristics:
 *   1. Keyword overlap — fraction of relevanceKeywords found in `textContent`
 *   2. Source type matching — whether the retrieved sourceType is expected
 *
 * KNOWN LIMITATION:
 *   Scoring is heuristic, not gold-label annotated. A chunk is considered
 *   "relevant" if it meets the keyword overlap threshold OR its sourceType
 *   is in the expected set. This over-estimates precision for large corpora
 *   and under-estimates it when corpora are empty or mismatched.
 *
 * @module ragScoring
 */

import type { SimilarityResult } from '../../lib/vectorStore.js';
import type { BenchmarkQuery } from './ragEvaluationDataset.js';

// ─── Thresholds ────────────────────────────────────────────────────────────────

/**
 * Minimum fraction of relevanceKeywords that must appear in a chunk's
 * textContent for the chunk to be considered "keyword-relevant".
 */
export const KEYWORD_OVERLAP_THRESHOLD = 0.2 as const;

// ─── Types ────────────────────────────────────────────────────────────────────

/** Relevance verdict for a single retrieved chunk. */
export interface ChunkRelevance {
  /** True if the chunk meets the relevance criteria (keyword OR sourceType match). */
  isRelevant: boolean;
  /** Fraction of relevanceKeywords present in textContent (0.0–1.0). */
  keywordOverlap: number;
  /** True if the chunk's sourceType is in expectedSourceTypes. */
  sourceTypeMatch: boolean;
}

/** Precision metrics for a single query evaluation. */
export interface QueryScoreResult {
  queryId: string;
  query: string;
  /** How many results were returned. */
  resultsCount: number;
  /** Precision at k=3: fraction of top-3 results that are relevant. */
  precisionAt3: number;
  /** Precision at k=5: fraction of top-5 results that are relevant. */
  precisionAt5: number;
  /**
   * Recall at k=5: fraction of expectedSourceTypes covered in top-5.
   * Approximated as: unique relevant sourceTypes / total expectedSourceTypes.
   */
  recallAt5: number;
  /** Per-chunk relevance detail (all returned results). */
  chunkRelevance: ChunkRelevance[];
}

/** Aggregated scores across all benchmark queries. */
export interface AggregateScoreResult {
  queriesScored: number;
  avgPrecisionAt3: number;
  avgPrecisionAt5: number;
  avgRecallAt5: number;
  /** Number of queries where at least one relevant result was returned. */
  queriesWithAnyRelevantResult: number;
  /** Per-query detail. */
  queryResults: QueryScoreResult[];
}

// ─── Core scoring functions ────────────────────────────────────────────────────

/**
 * Determine whether a single retrieved chunk is relevant for a given query.
 *
 * Relevance criteria (OR):
 *   - keywordOverlap >= KEYWORD_OVERLAP_THRESHOLD
 *   - sourceType is in expectedSourceTypes
 */
export function scoreChunkRelevance(
  result: SimilarityResult,
  query: BenchmarkQuery,
): ChunkRelevance {
  const content = (result.content ?? '').toLowerCase();
  const keywordMatches = query.relevanceKeywords.filter(kw =>
    content.includes(kw.toLowerCase()),
  ).length;
  const keywordOverlap =
    query.relevanceKeywords.length > 0
      ? keywordMatches / query.relevanceKeywords.length
      : 0;

  const sourceTypeMatch = query.expectedSourceTypes.some(
    st => st.toLowerCase() === (result.sourceType ?? '').toLowerCase(),
  );

  const isRelevant = keywordOverlap >= KEYWORD_OVERLAP_THRESHOLD || sourceTypeMatch;

  return { isRelevant, keywordOverlap, sourceTypeMatch };
}

/**
 * Compute precision@k: fraction of top-k results that are relevant.
 * Returns 0.0 if results is empty or k === 0.
 */
export function precisionAtK(relevances: ChunkRelevance[], k: number): number {
  if (k <= 0 || relevances.length === 0) return 0;
  const topK = relevances.slice(0, k);
  const relevantCount = topK.filter(r => r.isRelevant).length;
  return relevantCount / topK.length;
}

/**
 * Compute recall@k: fraction of expectedSourceTypes covered in top-k results.
 *
 * A sourceType is "covered" if at least one relevant result in top-k has that
 * sourceType. This is an approximation; ground-truth recall requires knowing
 * all relevant documents in the corpus.
 */
export function recallAtK(
  results: SimilarityResult[],
  relevances: ChunkRelevance[],
  query: BenchmarkQuery,
  k: number,
): number {
  if (query.expectedSourceTypes.length === 0) return 0;
  if (k <= 0 || results.length === 0) return 0;

  const topK = results.slice(0, k);
  const topKRelevances = relevances.slice(0, k);

  const coveredTypes = new Set<string>();
  for (const [i, result] of topK.entries()) {
    if (topKRelevances[i]?.isRelevant) {
      coveredTypes.add((result.sourceType ?? '').toLowerCase());
    }
  }

  const expectedLower = query.expectedSourceTypes.map(st => st.toLowerCase());
  const covered = expectedLower.filter(st => coveredTypes.has(st)).length;
  return covered / query.expectedSourceTypes.length;
}

// ─── Query-level scorer ────────────────────────────────────────────────────────

/**
 * Score all retrieved results for a single benchmark query.
 *
 * @param queryDef  The benchmark query definition (from ragEvaluationDataset)
 * @param results   Similarity results returned by querySimilar for this query
 * @returns         Query-level precision and recall metrics
 */
export function scoreQueryResults(
  queryDef: BenchmarkQuery,
  results: SimilarityResult[],
): QueryScoreResult {
  const chunkRelevance = results.map(r => scoreChunkRelevance(r, queryDef));

  return {
    queryId: queryDef.id,
    query: queryDef.query,
    resultsCount: results.length,
    precisionAt3: precisionAtK(chunkRelevance, 3),
    precisionAt5: precisionAtK(chunkRelevance, 5),
    recallAt5: recallAtK(results, chunkRelevance, queryDef, 5),
    chunkRelevance,
  };
}

// ─── Aggregate scorer ─────────────────────────────────────────────────────────

/**
 * Aggregate per-query scores into a single benchmark result.
 *
 * @param queryResults  Array of QueryScoreResult from scoreQueryResults()
 * @returns             Aggregated precision/recall metrics
 */
export function aggregateScores(queryResults: QueryScoreResult[]): AggregateScoreResult {
  const n = queryResults.length;
  if (n === 0) {
    return {
      queriesScored: 0,
      avgPrecisionAt3: 0,
      avgPrecisionAt5: 0,
      avgRecallAt5: 0,
      queriesWithAnyRelevantResult: 0,
      queryResults: [],
    };
  }

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  const avgPrecisionAt3 = sum(queryResults.map(q => q.precisionAt3)) / n;
  const avgPrecisionAt5 = sum(queryResults.map(q => q.precisionAt5)) / n;
  const avgRecallAt5 = sum(queryResults.map(q => q.recallAt5)) / n;
  const queriesWithAnyRelevantResult = queryResults.filter(q =>
    q.chunkRelevance.some(r => r.isRelevant),
  ).length;

  return {
    queriesScored: n,
    avgPrecisionAt3,
    avgPrecisionAt5,
    avgRecallAt5,
    queriesWithAnyRelevantResult,
    queryResults,
  };
}
