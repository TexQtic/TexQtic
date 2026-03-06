/**
 * ragBenchmarkRunner.ts — G-028 A7: Benchmark execution engine
 *
 * Task ID: OPS-G028-A7-RETRIEVAL-QUALITY-LATENCY-BENCHMARK
 * Doctrine: v1.4 — evaluation-only; no schema/migration/production behavior change
 *
 * Runs the full benchmark loop:
 *   for each query in RAG_BENCHMARK_QUERIES:
 *     1. Generate embedding (Gemini text-embedding-004)
 *     2. Execute querySimilar (vector retrieval)
 *     3. Measure embedding + retrieval + total latency
 *     4. Score results (precision@3, precision@5, recall@5)
 *   Aggregate all per-query metrics into a single BenchmarkReport.
 *
 * CONSTITUTIONAL CONSTRAINTS:
 *   - Read-only: no INSERT/UPDATE/DELETE
 *   - No schema changes, no migrations
 *   - No changes to vectorStore.ts query behavior
 *   - All DB calls go through the provided VectorStoreClient
 *   - Must accept an injectable generateEmbedding / querySimilar for testability
 *
 * @module ragBenchmarkRunner
 */

import type { SimilarityResult, VectorStoreClient } from '../../lib/vectorStore.js';
import type { BenchmarkQuery } from './ragEvaluationDataset.js';
import { RAG_BENCHMARK_QUERIES } from './ragEvaluationDataset.js';
import {
  scoreQueryResults,
  aggregateScores,
  type QueryScoreResult,
  type AggregateScoreResult,
} from './ragScoring.js';
import {
  THRESHOLD_RETRIEVAL_MS,
  THRESHOLD_EMBEDDING_MS,
  THRESHOLD_TOTAL_MS,
} from './ragMetrics.js';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Latency timing for a single query execution. */
export interface QueryLatency {
  queryId: string;
  embeddingMs: number;
  retrievalMs: number;
  totalMs: number;
}

/** Per-query result combining latency and quality scores. */
export interface QueryBenchmarkResult {
  latency: QueryLatency;
  score: QueryScoreResult;
  /** Number of results returned by querySimilar. */
  resultsCount: number;
  /** Top similarity score of returned chunks. null if no results. */
  topScore: number | null;
  /** Whether any error occurred during this query. */
  error: string | null;
}

/** Aggregated latency statistics across all benchmark queries. */
export interface LatencyReport {
  avgEmbeddingMs: number;
  avgRetrievalMs: number;
  avgTotalMs: number;
  p95EmbeddingMs: number;
  p95RetrievalMs: number;
  p95TotalMs: number;
  maxEmbeddingMs: number;
  maxRetrievalMs: number;
  maxTotalMs: number;
}

/** Full benchmark output from runBenchmark(). */
export interface BenchmarkReport {
  runAt: string;
  queriesTested: number;
  queriesErrored: number;
  latency: LatencyReport;
  quality: AggregateScoreResult;
  thresholds: {
    retrievalTarget: number;
    embeddingTarget: number;
    totalTarget: number;
    retrievalPass: boolean;
    embeddingPass: boolean;
    totalPass: boolean;
    overallPass: boolean;
  };
  perQuery: QueryBenchmarkResult[];
}

/** Injectable dependencies — allows mocking in tests without hitting Gemini or DB. */
export interface BenchmarkDeps {
  /**
   * Embedding generator. Default: generateEmbedding from vectorIngestion.
   * Injectable for tests (mock to return a fixed 768-dim array instantly).
   */
  generateEmbedding: (text: string) => Promise<number[]>;
  /**
   * Vector retrieval function. Default: querySimilar from vectorStore.
   * Injectable for tests (mock to return canned SimilarityResult[]).
   */
  querySimilar: (
    client: VectorStoreClient,
    orgId: string,
    embedding: number[],
    opts: { topK?: number; minSimilarity?: number },
  ) => Promise<SimilarityResult[]>;
  /** Prisma-compatible client for querySimilar. May be a mock in tests. */
  dbClient: VectorStoreClient;
  /** Org UUID to use for all queries (scopes results via RLS in production). */
  orgId: string;
  /** Maximum results to request per query. Defaults to 5. */
  topK?: number;
  /** Minimum similarity threshold. Defaults to 0.30. */
  minSimilarity?: number;
  /** Queries to run. Defaults to RAG_BENCHMARK_QUERIES. */
  queries?: BenchmarkQuery[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function computeLatencyReport(latencies: QueryLatency[]): LatencyReport {
  if (latencies.length === 0) {
    return {
      avgEmbeddingMs: 0, avgRetrievalMs: 0, avgTotalMs: 0,
      p95EmbeddingMs: 0, p95RetrievalMs: 0, p95TotalMs: 0,
      maxEmbeddingMs: 0, maxRetrievalMs: 0, maxTotalMs: 0,
    };
  }

  const embArr = [...latencies.map(l => l.embeddingMs)].sort((a, b) => a - b);
  const retArr = [...latencies.map(l => l.retrievalMs)].sort((a, b) => a - b);
  const totArr = [...latencies.map(l => l.totalMs)].sort((a, b) => a - b);

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  return {
    avgEmbeddingMs: avg(embArr),
    avgRetrievalMs: avg(retArr),
    avgTotalMs: avg(totArr),
    p95EmbeddingMs: percentile(embArr, 95),
    p95RetrievalMs: percentile(retArr, 95),
    p95TotalMs: percentile(totArr, 95),
    maxEmbeddingMs: Math.max(...embArr),
    maxRetrievalMs: Math.max(...retArr),
    maxTotalMs: Math.max(...totArr),
  };
}

// ─── Runner ───────────────────────────────────────────────────────────────────

/**
 * Execute the full RAG benchmark.
 *
 * Iterates over all queries, measures embedding + retrieval latency, scores
 * results, and returns a single BenchmarkReport.
 *
 * This function is READ-ONLY — it calls querySimilar (SELECT only) and
 * generateEmbedding (external API call). No DB mutations occur.
 *
 * @param deps  Injectable dependencies for testability and CLI use
 * @returns     Full benchmark report
 */
export async function runBenchmark(deps: BenchmarkDeps): Promise<BenchmarkReport> {
  const {
    generateEmbedding,
    querySimilar,
    dbClient,
    orgId,
    topK = 5,
    minSimilarity = 0.30,
    queries = RAG_BENCHMARK_QUERIES,
  } = deps;

  const queryResults: QueryBenchmarkResult[] = [];
  const successLatencies: QueryLatency[] = [];
  let errored = 0;

  for (const queryDef of queries) {
    const queryStart = Date.now();
    let embeddingMs = 0;
    let retrievalMs = 0;
    let results: SimilarityResult[] = [];
    let errorMsg: string | null = null;

    try {
      // ── Embedding phase ──────────────────────────────────────────────────
      const embStart = Date.now();
      const embedding = await generateEmbedding(queryDef.query);
      embeddingMs = Date.now() - embStart;

      // ── Retrieval phase ───────────────────────────────────────────────────
      const retStart = Date.now();
      results = await querySimilar(dbClient, orgId, embedding, { topK, minSimilarity });
      retrievalMs = Date.now() - retStart;
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : String(err);
      errored++;
    }

    const totalMs = Date.now() - queryStart;

    const latency: QueryLatency = {
      queryId: queryDef.id,
      embeddingMs,
      retrievalMs,
      totalMs,
    };

    const score = scoreQueryResults(queryDef, results);

    const topScore = results.length > 0
      ? Math.max(...results.map(r => r.similarity))
      : null;

    queryResults.push({
      latency,
      score,
      resultsCount: results.length,
      topScore,
      error: errorMsg,
    });

    if (errorMsg === null) {
      successLatencies.push(latency);
    }
  }

  // ── Aggregate ─────────────────────────────────────────────────────────────
  const latencyReport = computeLatencyReport(successLatencies);
  const qualityReport = aggregateScores(queryResults.map(r => r.score));

  const retrievalPass = latencyReport.avgRetrievalMs <= THRESHOLD_RETRIEVAL_MS;
  const embeddingPass = latencyReport.avgEmbeddingMs <= THRESHOLD_EMBEDDING_MS;
  const totalPass = latencyReport.avgTotalMs <= THRESHOLD_TOTAL_MS;

  return {
    runAt: new Date().toISOString(),
    queriesTested: queries.length,
    queriesErrored: errored,
    latency: latencyReport,
    quality: qualityReport,
    thresholds: {
      retrievalTarget: THRESHOLD_RETRIEVAL_MS,
      embeddingTarget: THRESHOLD_EMBEDDING_MS,
      totalTarget: THRESHOLD_TOTAL_MS,
      retrievalPass,
      embeddingPass,
      totalPass,
      overallPass: retrievalPass && embeddingPass && totalPass,
    },
    perQuery: queryResults,
  };
}
