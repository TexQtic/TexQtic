#!/usr/bin/env tsx
/**
 * rag-benchmark.ts — G-028 A7: CLI benchmark runner
 *
 * Task ID: OPS-G028-A7-RETRIEVAL-QUALITY-LATENCY-BENCHMARK
 * Doctrine: v1.4 — evaluation-only; read-only; no production behavior change
 *
 * Usage:
 *   pnpm exec tsx scripts/rag-benchmark.ts
 *
 * Environment variables required:
 *   GEMINI_API_KEY  — valid Gemini API key for embedding generation
 *   DATABASE_URL    — Supabase connection string (read-only benchmark queries)
 *
 * Optional:
 *   BENCHMARK_ORG_ID   — UUID of the tenant to run retrieval against
 *                        (defaults to a zero UUID for empty-corpus testing)
 *   BENCHMARK_TOP_K    — Override topK (default: 5)
 *   BENCHMARK_MIN_SIM  — Override minSimilarity (default: 0.30)
 *
 * Output:
 *   Human-readable summary to stdout
 *   JSON report written to server/scripts/rag-benchmark-output.json
 *
 * NOTE: This script is LOCAL-ONLY. It is not run in CI. It must not be
 * invoked as part of any production deployment pipeline.
 */

import { PrismaClient } from '@prisma/client';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runBenchmark } from '../src/services/ai/ragBenchmarkRunner.js';
import { generateEmbedding } from '../src/services/vectorIngestion.js';
import { querySimilar } from '../src/lib/vectorStore.js';
import type { BenchmarkReport } from '../src/services/ai/ragBenchmarkRunner.js';
import {
  THRESHOLD_RETRIEVAL_MS,
  THRESHOLD_EMBEDDING_MS,
  THRESHOLD_TOTAL_MS,
} from '../src/services/ai/ragMetrics.js';
import { BENCHMARK_QUERY_COUNT } from '../src/services/ai/ragEvaluationDataset.js';

// ─── Config ────────────────────────────────────────────────────────────────────

const BENCHMARK_ORG_ID =
  process.env['BENCHMARK_ORG_ID'] ?? '00000000-0000-0000-0000-000000000000';
const BENCHMARK_TOP_K = Number.parseInt(process.env['BENCHMARK_TOP_K'] ?? '5', 10);
const BENCHMARK_MIN_SIM = Number.parseFloat(process.env['BENCHMARK_MIN_SIM'] ?? '0.30');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_PATH = path.join(__dirname, 'rag-benchmark-output.json');

// ─── Formatting helpers ────────────────────────────────────────────────────────

function fmt(n: number, decimals = 1): string {
  return n.toFixed(decimals);
}

function passIcon(pass: boolean | null): string {
  if (pass === null) return '—';
  return pass ? '✅' : '❌';
}

function printReport(report: BenchmarkReport): void {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  RAG BENCHMARK RESULTS — G-028 A7');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Run at:           ${report.runAt}`);
  console.log(`  Queries tested:   ${report.queriesTested}`);
  console.log(`  Queries errored:  ${report.queriesErrored}`);
  console.log('');

  console.log('― LATENCY ──────────────────────────────────────────────────');
  console.log(`  Embedding  avg: ${fmt(report.latency.avgEmbeddingMs)}ms   p95: ${fmt(report.latency.p95EmbeddingMs)}ms   max: ${fmt(report.latency.maxEmbeddingMs)}ms   target: <${THRESHOLD_EMBEDDING_MS}ms  ${passIcon(report.thresholds.embeddingPass)}`);
  console.log(`  Retrieval  avg: ${fmt(report.latency.avgRetrievalMs)}ms   p95: ${fmt(report.latency.p95RetrievalMs)}ms   max: ${fmt(report.latency.maxRetrievalMs)}ms   target: <${THRESHOLD_RETRIEVAL_MS}ms  ${passIcon(report.thresholds.retrievalPass)}`);
  console.log(`  Total      avg: ${fmt(report.latency.avgTotalMs)}ms   p95: ${fmt(report.latency.p95TotalMs)}ms   max: ${fmt(report.latency.maxTotalMs)}ms   target: <${THRESHOLD_TOTAL_MS}ms  ${passIcon(report.thresholds.totalPass)}`);
  console.log('');

  console.log('― QUALITY ──────────────────────────────────────────────────');
  console.log(`  Precision@3:          ${fmt(report.quality.avgPrecisionAt3, 3)}`);
  console.log(`  Precision@5:          ${fmt(report.quality.avgPrecisionAt5, 3)}`);
  console.log(`  Recall@5:             ${fmt(report.quality.avgRecallAt5, 3)}`);
  console.log(`  Queries w/ results:   ${report.quality.queriesWithAnyRelevantResult} / ${report.queriesTested}`);
  console.log('');

  console.log('― THRESHOLD VERDICT ────────────────────────────────────────');
  console.log(`  Retrieval <${THRESHOLD_RETRIEVAL_MS}ms:   ${passIcon(report.thresholds.retrievalPass)}`);
  console.log(`  Embedding <${THRESHOLD_EMBEDDING_MS}ms:  ${passIcon(report.thresholds.embeddingPass)}`);
  console.log(`  Total <${THRESHOLD_TOTAL_MS}ms:      ${passIcon(report.thresholds.totalPass)}`);
  console.log(`  OVERALL:          ${report.thresholds.overallPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');

  console.log('― PER-QUERY SUMMARY ────────────────────────────────────────');
  for (const q of report.perQuery) {
    const errTag = q.error ? ` [ERROR: ${q.error.slice(0, 40)}]` : '';
    console.log(
      `  ${q.score.queryId.padEnd(12)} ` +
      `emb=${fmt(q.latency.embeddingMs)}ms ` +
      `ret=${fmt(q.latency.retrievalMs)}ms ` +
      `tot=${fmt(q.latency.totalMs)}ms ` +
      `res=${q.resultsCount} ` +
      `p@3=${fmt(q.score.precisionAt3, 2)} ` +
      `p@5=${fmt(q.score.precisionAt5, 2)}` +
      errTag,
    );
  }
  console.log('');

  console.log('― KNOWN LIMITATIONS ────────────────────────────────────────');
  console.log('  1. Evaluation dataset is synthetic (not gold-label annotated).');
  console.log('  2. Relevance scoring uses keyword overlap + sourceType heuristics.');
  console.log('  3. Results depend on ingestion coverage (empty corpus → precision=0).');
  console.log('  4. Benchmark executed locally only — not a CI gate.');
  console.log('  5. Embedding latency includes Gemini API round-trip (network variable).');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('[rag-benchmark] Starting G-028 A7 benchmark...');
  console.log(`[rag-benchmark] Org: ${BENCHMARK_ORG_ID}`);
  console.log(`[rag-benchmark] Queries: ${BENCHMARK_QUERY_COUNT}`);
  console.log(`[rag-benchmark] topK=${BENCHMARK_TOP_K} minSim=${BENCHMARK_MIN_SIM}`);

  const prisma = new PrismaClient();

  try {
    const report = await runBenchmark({
      generateEmbedding,
      querySimilar,
      dbClient: prisma,
      orgId: BENCHMARK_ORG_ID,
      topK: BENCHMARK_TOP_K,
      minSimilarity: BENCHMARK_MIN_SIM,
    });

    printReport(report);

    // Write JSON output
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`[rag-benchmark] JSON report written to: ${OUTPUT_PATH}`);

    const exitCode = report.queriesErrored === report.queriesTested ? 1 : 0;
    process.exit(exitCode);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('[rag-benchmark] Fatal error:', err);
  process.exit(1);
});
