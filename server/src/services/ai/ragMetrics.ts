/**
 * ragMetrics.ts — G-028 A7: RAG evaluation and latency instrumentation
 *
 * Task ID: OPS-G028-A7-RETRIEVAL-QUALITY-LATENCY-BENCHMARK
 * Doctrine: v1.4 — read-only instrumentation; never persisted; no production behavior change
 *
 * Provides a lightweight per-request metrics accumulator.
 * All values are logged to console only — no DB writes, no schema changes.
 *
 * CONSTITUTIONAL CONSTRAINTS:
 *   - This module NEVER modifies inference behavior
 *   - This module NEVER persists data
 *   - All functions are side-effect-free except console.info (observability only)
 *
 * @module ragMetrics
 */

// ─── Thresholds (production readiness targets) ────────────────────────────────

/** Maximum acceptable retrieval latency (ms) */
export const THRESHOLD_RETRIEVAL_MS = 50 as const;

/** Maximum acceptable embedding generation latency (ms) */
export const THRESHOLD_EMBEDDING_MS = 500 as const;

/** Maximum acceptable total endpoint latency (ms) */
export const THRESHOLD_TOTAL_MS = 800 as const;

// ─── Types ────────────────────────────────────────────────────────────────────

/** Snapshot of all latency metrics for a single RAG-augmented request. */
export interface RagMetricsSnapshot {
  /** Time spent in querySimilar (DB vector search), in ms. null if not measured. */
  retrievalMs: number | null;
  /** Time spent generating the query embedding (Gemini API call), in ms. null if not measured. */
  embeddingMs: number | null;
  /** Time spent in generateContent (Gemini inference), in ms. null if not measured. */
  inferenceMs: number | null;
  /** Wall-clock time from metrics start to recordTotalLatency call, in ms. null if not measured. */
  totalMs: number | null;
  /** Number of similarity results returned by querySimilar. */
  resultsCount: number;
  /** Top cosine similarity score from retrieved chunks. null if no results. */
  topScore: number | null;
  /** Whether all thresholds were met (pass = true). */
  thresholdPass: boolean;
  /** Threshold evaluation detail per metric. */
  thresholdDetail: {
    retrievalPass: boolean | null;
    embeddingPass: boolean | null;
    totalPass: boolean | null;
  };
}

/** Mutable accumulator used within a single request. */
export interface RagMetricsHandle {
  _startMs: number;
  _embeddingStartMs: number | null;
  _retrievalStartMs: number | null;
  _inferenceStartMs: number | null;
  _embeddingMs: number | null;
  _retrievalMs: number | null;
  _inferenceMs: number | null;
  _resultsCount: number;
  _topScore: number | null;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create and start a new metrics handle.
 * Call this at the start of the RAG-augmented section of the request.
 */
export function startTimer(): RagMetricsHandle {
  return {
    _startMs: Date.now(),
    _embeddingStartMs: null,
    _retrievalStartMs: null,
    _inferenceStartMs: null,
    _embeddingMs: null,
    _retrievalMs: null,
    _inferenceMs: null,
    _resultsCount: 0,
    _topScore: null,
  };
}

// ─── Phase recording ──────────────────────────────────────────────────────────

/** Call immediately before generating the query embedding. */
export function markEmbeddingStart(handle: RagMetricsHandle): void {
  handle._embeddingStartMs = Date.now();
}

/**
 * Call immediately after the query embedding is ready.
 * Records the embedding generation latency.
 */
export function recordEmbeddingLatency(handle: RagMetricsHandle): void {
  if (handle._embeddingStartMs !== null) {
    handle._embeddingMs = Date.now() - handle._embeddingStartMs;
  }
}

/** Call immediately before executing querySimilar. */
export function markRetrievalStart(handle: RagMetricsHandle): void {
  handle._retrievalStartMs = Date.now();
}

/**
 * Call immediately after querySimilar returns.
 * Records retrieval latency and captures result-level metrics.
 *
 * @param handle       Metrics accumulator
 * @param resultsCount Number of results returned
 * @param topScore     Similarity score of the top result (null if empty)
 */
export function recordRetrievalLatency(
  handle: RagMetricsHandle,
  resultsCount: number,
  topScore: number | null,
): void {
  if (handle._retrievalStartMs !== null) {
    handle._retrievalMs = Date.now() - handle._retrievalStartMs;
  }
  handle._resultsCount = resultsCount;
  handle._topScore = topScore;
}

/** Call immediately before the Gemini generateContent call. */
export function markInferenceStart(handle: RagMetricsHandle): void {
  handle._inferenceStartMs = Date.now();
}

/** Call immediately after generateContent returns. Records inference latency. */
export function recordInferenceLatency(handle: RagMetricsHandle): void {
  if (handle._inferenceStartMs !== null) {
    handle._inferenceMs = Date.now() - handle._inferenceStartMs;
  }
}

// ─── Snapshot + emit ──────────────────────────────────────────────────────────

/**
 * Finalise the metrics handle, evaluate thresholds, log to console, and
 * return an immutable snapshot.
 *
 * This is the only function that emits a log line — and only to console.info.
 * It NEVER writes to DB, audit logs, or reasoning_logs.
 */
export function recordTotalLatency(handle: RagMetricsHandle): RagMetricsSnapshot {
  const totalMs = Date.now() - handle._startMs;

  const retrievalPass =
    handle._retrievalMs !== null ? handle._retrievalMs <= THRESHOLD_RETRIEVAL_MS : null;
  const embeddingPass =
    handle._embeddingMs !== null ? handle._embeddingMs <= THRESHOLD_EMBEDDING_MS : null;
  const totalPass = totalMs <= THRESHOLD_TOTAL_MS;

  const thresholdPass =
    (retrievalPass === null || retrievalPass) &&
    (embeddingPass === null || embeddingPass) &&
    totalPass;

  const snapshot: RagMetricsSnapshot = {
    retrievalMs: handle._retrievalMs,
    embeddingMs: handle._embeddingMs,
    inferenceMs: handle._inferenceMs,
    totalMs,
    resultsCount: handle._resultsCount,
    topScore: handle._topScore,
    thresholdPass,
    thresholdDetail: { retrievalPass, embeddingPass, totalPass },
  };

  console.info('[G028-A7][rag_metrics]', {
    retrievalMs: snapshot.retrievalMs,
    embeddingMs: snapshot.embeddingMs,
    inferenceMs: snapshot.inferenceMs,
    totalMs: snapshot.totalMs,
    resultsCount: snapshot.resultsCount,
    topScore: snapshot.topScore !== null ? Number(snapshot.topScore.toFixed(4)) : null,
    thresholdPass: snapshot.thresholdPass,
    thresholds: {
      retrieval: `${THRESHOLD_RETRIEVAL_MS}ms`,
      embedding: `${THRESHOLD_EMBEDDING_MS}ms`,
      total: `${THRESHOLD_TOTAL_MS}ms`,
    },
  });

  return snapshot;
}
