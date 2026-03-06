/**
 * vectorEmbeddingClient.ts — G-028 A6: Extracted embedding client module
 *
 * Task ID: OPS-G028-A6-SOURCE-EXPANSION-ASYNC-INDEXING
 *
 * Extracted from vectorIngestion.ts (A4) to support reuse by the async
 * worker without importing the full ingestion module.
 *
 * Exported from vectorIngestion.ts via re-export for full backward compatibility.
 *
 * CONSTITUTIONAL CONSTRAINTS:
 *   - Embedding model pinned: text-embedding-004 (ADR-028 §5.1, dim = 768)
 *   - Output length validated against EMBEDDING_DIM before return
 *   - Retries once on transient failure — throws after exhaustion
 *   - Chunk content is never logged (PII prevention)
 *
 * @module vectorEmbeddingClient
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/index.js';
import { EMBEDDING_DIM } from '../lib/vectorStore.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Embedding model, pinned per ADR-028 §5.1 and §6. */
export const EMBEDDING_MODEL = 'text-embedding-004' as const;

/** Max retry attempts on transient Gemini failure. */
const EMBEDDING_MAX_RETRIES = 1 as const;

// ─── Lazy Gemini client ───────────────────────────────────────────────────────

let _genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) {
    _genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  }
  return _genAI;
}

/**
 * Override the Gemini client for tests. Pass `null` to reset to lazy default.
 * MUST be called in beforeEach / afterEach to avoid cross-test pollution.
 */
export function _overrideGenAIForTests(instance: GoogleGenerativeAI | null): void {
  _genAI = instance;
}

// ─── generateEmbedding ────────────────────────────────────────────────────────

/**
 * Generate a 768-dimensional embedding using Gemini text-embedding-004.
 *
 * - Validates output dimension === EMBEDDING_DIM (fail-fast if Gemini changes).
 * - Retries once on transient failure (TECS A4 §5, A6 §6).
 * - Throws on persistent failure — callers must catch.
 *
 * @param text        Content to embed (should be ≤ MAX_CHUNK_LENGTH chars for quality).
 * @param genAIClient Optional override for dependency injection in tests.
 * @returns           Float array of length EMBEDDING_DIM (768).
 */
export async function generateEmbedding(
  text: string,
  genAIClient?: GoogleGenerativeAI,
): Promise<number[]> {
  const client = genAIClient ?? getGenAI();
  const model = client.getGenerativeModel({ model: EMBEDDING_MODEL });

  let lastError: unknown;

  for (let attempt = 0; attempt <= EMBEDDING_MAX_RETRIES; attempt++) {
    try {
      const result = await model.embedContent(text);
      const values = result.embedding.values;

      if (!values || values.length !== EMBEDDING_DIM) {
        throw new Error(
          `[G028-A6] Embedding dimension mismatch: expected ${EMBEDDING_DIM}, got ${values?.length ?? 0}`,
        );
      }

      // Spread Float32Array (or number[]) into plain number[]
      return Array.from(values);
    } catch (err) {
      lastError = err;
      if (attempt < EMBEDDING_MAX_RETRIES) {
        // 100 ms back-off before retry
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  throw lastError;
}
