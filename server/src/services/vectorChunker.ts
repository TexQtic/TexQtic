/**
 * vectorChunker.ts — G-028 A6: Extracted text chunker module
 *
 * Task ID: OPS-G028-A6-SOURCE-EXPANSION-ASYNC-INDEXING
 *
 * Extracted from vectorIngestion.ts (A4) to support reuse across the async
 * indexing pipeline without importing the full ingestion module (avoids
 * circular deps between vectorIndexQueue ↔ vectorIngestion).
 *
 * Exported from vectorIngestion.ts via re-export for backward compatibility.
 *
 * CONSTITUTIONAL CONSTRAINTS:
 *   - Pure module: no I/O, no DB, no Gemini calls
 *   - deterministic: same input → same chunk hashes (SHA-256 of trimmed content)
 *   - Chunk content is never logged (PII prevention — enforced by callers)
 *
 * @module vectorChunker
 */

import { createHash } from 'node:crypto';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum characters per chunk (ADR-028 §5). */
export const MAX_CHUNK_LENGTH = 800 as const;

/** Overlap between consecutive chunks (ADR-028 §5). */
export const CHUNK_OVERLAP = 100 as const;

/** Hard cap on chunks per source document (ADR-028 §10). */
export const MAX_CHUNKS_PER_DOC = 20 as const;

/** Hard cap on source document size before chunking (ADR-028 §10). */
export const MAX_DOC_SIZE = 20_000 as const;

// ─── Types ────────────────────────────────────────────────────────────────────

/** One text chunk produced by chunkText(). */
export interface TextChunk {
  chunkIndex: number;
  content: string;
  /** SHA-256 hex of trimmed content — deterministic for same text. */
  contentHash: string;
}

// ─── chunkText ────────────────────────────────────────────────────────────────

/**
 * Split text into deterministic sliding-window chunks.
 *
 * Rules:
 *   - Splits are word-boundary-safe (no mid-word cuts) where possible.
 *   - Each chunk is at most `maxLen` characters.
 *   - Consecutive chunks share `overlap` characters of context.
 *   - At most `maxChunks` chunks are produced (remaining text silently dropped;
 *     callers should enforce MAX_DOC_SIZE before calling).
 *   - contentHash is SHA-256 of trimmed content — deterministic for same input.
 *
 * @param text      Source text to chunk.
 * @param maxLen    Max characters per chunk (default MAX_CHUNK_LENGTH = 800).
 * @param overlap   Overlap characters between chunks (default CHUNK_OVERLAP = 100).
 * @param maxChunks Max chunks (default MAX_CHUNKS_PER_DOC = 20).
 * @returns         Array of TextChunk, in order.
 */
export function chunkText(
  text: string,
  maxLen: number = MAX_CHUNK_LENGTH,
  overlap: number = CHUNK_OVERLAP,
  maxChunks: number = MAX_CHUNKS_PER_DOC,
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let start = 0;
  const stride = Math.max(1, maxLen - overlap);

  while (start < text.length && chunks.length < maxChunks) {
    let end = start + maxLen;

    if (end < text.length) {
      // Prefer cutting at a word boundary (space or newline) within last 20% of chunk
      const searchFrom = start + Math.floor(maxLen * 0.8);
      const breakAt = text.lastIndexOf(' ', end);
      if (breakAt >= searchFrom) {
        end = breakAt;
      }
    } else {
      end = text.length;
    }

    const content = text.slice(start, end).trim();
    if (content.length > 0) {
      const contentHash = createHash('sha256').update(content).digest('hex');
      chunks.push({ chunkIndex: chunks.length, content, contentHash });
    }

    start += stride;
  }

  return chunks;
}
