/**
 * controlPlaneInferenceService.ts — PW5-G028-C1-CONTROL-PLANE-AI-INSIGHTS
 *
 * Control-Plane Inference Service: first-slice backend boundary for SUPER_ADMIN
 * AI invocation. Deliberately separate from tenant TIS (inferenceService.ts).
 *
 * Slice 1 scope:
 *   - Platform-level AI insights for SUPER_ADMIN only
 *   - No per-org targeting (no orgId injected from client)
 *   - Reasoning / prompt-summary persisted in admin audit metadataJson, NOT reasoning_logs
 *   - No tenant budget enforcement, no tenant rate-limit map, no idempotency window
 *   - PII redaction applied pre-send; output scanned for PII leak
 *   - Event emission: reuses ai.inference.generate only (no new ai.control.* names)
 *   - Event emission is always best-effort / non-blocking
 *
 * FORBIDDEN in this unit:
 *   - Writing to reasoning_logs
 *   - Accepting client-trusted orgId / tenantId / role
 *   - Tenant budget, idempotency, or rate-limit paths
 *   - Per-org targeting
 *   - New ai.control.* event names
 *   - Reopening or refactoring inferenceService.ts
 *
 * SCOPE: PW5-G028-C1 only.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';
import { config } from '../../config/index.js';
import { writeAuditLog, createAdminAudit } from '../../lib/auditLog.js';
import { redactPii, scanForPii } from './piiGuard.js';
import { emitAiEventBestEffort } from '../../events/aiEmitter.js';

// ---------------------------------------------------------------------------
// Re-export isGenAiConfigured from tenant TIS for shared health reporting.
// This is a read-only import of a pure configuration probe — it does NOT
// collapse control-plane execution into the tenant TIS flow.
// ---------------------------------------------------------------------------
export { isGenAiConfigured } from './inferenceService.js';

// ---------------------------------------------------------------------------
// Constants (control-plane-specific ceiling, not shared with tenant TIS)
// ---------------------------------------------------------------------------

/** Inference timeout for control-plane requests (admin-initiated, slightly wider). */
const CP_INFERENCE_TIMEOUT_MS = 12_000;

/** Maximum input prompt length accepted from route handler (chars). */
const CP_MAX_PROMPT_CHARS = 2_000;

/**
 * Canonical admin-realm sentinel UUID used as control-plane orgId for event
 * payloads. Mirrors ADMIN_SENTINEL_ID in control.ts.
 */
const ADMIN_SENTINEL_ORG = '00000000-0000-0000-0000-000000000001';

// ---------------------------------------------------------------------------
// Module-level Gemini client — control-plane surface.
// Intentionally separate from the tenant TIS module-level genAI instance to
// maintain explicit unit boundary (no shared mutable state).
// ---------------------------------------------------------------------------

let cpGenAI: GoogleGenerativeAI | null = null;
try {
  if (config.GEMINI_API_KEY) {
    cpGenAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  }
} catch {
  console.warn('[ControlPlaneAI] Gemini initialization failed — running in fallback mode');
}

// ---------------------------------------------------------------------------
// Input / Output types
// ---------------------------------------------------------------------------

/**
 * Input for runControlPlaneInsight.
 *
 * All identity fields (adminId) MUST be sourced from verified JWT by the
 * route handler. No client-body identity signal is accepted here.
 */
export interface CpInsightInput {
  /** Prompt text supplied by the route handler (validated, max 2 000 chars). */
  prompt: string;

  /**
   * Optional focus context (e.g. 'platform-health', 'usage-trends').
   * Appended to the prompt — not a trust signal.
   */
  focus?: string;

  /** SUPER_ADMIN actor ID — injected from verified JWT, never from client body. */
  adminId: string;

  /** Caller-generated request trace ID. */
  requestId: string;

  /** Prisma client for admin audit persistence. */
  prisma: PrismaClient;
}

/**
 * Result returned to the route handler after all orchestration completes.
 */
export interface CpInsightResult {
  /** Model output (or degraded-mode placeholder). */
  text: string;

  /** Estimated tokens consumed (rough: (prompt_chars + text_chars) / 4). */
  tokensUsed: number;

  /** True when model invocation failed and a safe fallback was returned. */
  hadInferenceError: boolean;

  /** Wall-clock model latency in milliseconds. */
  inferenceLatencyMs: number;

  /** True when PII was detected and redacted from the prompt before send. */
  piiRedacted: boolean;

  /** True when PII was detected in the raw model output. */
  outputPiiDetected: boolean;
}

// ---------------------------------------------------------------------------
// Internal: control-plane content generator with timeout guard
// ---------------------------------------------------------------------------

/**
 * Invoke Gemini with a control-plane system instruction and timeout guard.
 * Returns a degraded-mode result for any failure rather than throwing.
 */
async function cpGenerateContent(
  prompt: string,
  timeoutMs: number = CP_INFERENCE_TIMEOUT_MS
): Promise<{ text: string; tokensUsed: number; hadInferenceError: boolean }> {
  if (!cpGenAI) {
    return {
      text: 'AI service temporarily unavailable. GEMINI_API_KEY not configured.',
      tokensUsed: 0,
      hadInferenceError: false,
    };
  }

  try {
    const model = cpGenAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction:
        'You are a strategic AI advisor for the TexQtic platform control plane. ' +
        'Provide concise, factual platform-level insights for platform administrators. ' +
        'Do not speculate on or reveal individual tenant data. ' +
        'Keep responses focused and under 5 sentences.',
    });

    const aiPromise = model.generateContent(prompt);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Control-plane AI request timeout')), timeoutMs)
    );

    const result = await Promise.race([aiPromise, timeoutPromise]);
    const text = result.response.text();

    // Rough estimate: 1 token ≈ 4 characters (mirrors tenant TIS heuristic)
    const estimatedTokens = Math.ceil((prompt.length + text.length) / 4);

    return { text, tokensUsed: estimatedTokens, hadInferenceError: false };
  } catch (error) {
    console.error('[ControlPlaneAI] Generation error:', error);
    return {
      text: 'AI service encountered an error. Please try again later.',
      tokensUsed: 0,
      hadInferenceError: true,
    };
  }
}

// ---------------------------------------------------------------------------
// Public API: runControlPlaneInsight
// ---------------------------------------------------------------------------

/**
 * Execute a control-plane AI insight request.
 *
 * Guarantees (all non-negotiable):
 *   1. Input ceiling: prompt truncated to CP_MAX_PROMPT_CHARS before processing.
 *   2. PII redaction applied to prompt before send; violated prompts are sanitised.
 *   3. Model output scanned for PII; detected output is suppressed with a safe message.
 *   4. Admin audit record written (reasoning summary in metadataJson) — NOT reasoning_logs.
 *   5. Event emission is best-effort / non-blocking; failure never breaks the primary flow.
 *   6. No client-trusted identity signal is accepted or forwarded.
 *   7. No tenant budget or reasoning_logs paths are invoked.
 */
export async function runControlPlaneInsight(input: CpInsightInput): Promise<CpInsightResult> {
  const { prompt: rawPrompt, focus, adminId, requestId, prisma } = input;

  // ── 1. Input ceiling guard ─────────────────────────────────────────────────
  const truncatedPrompt = rawPrompt.slice(0, CP_MAX_PROMPT_CHARS);

  // ── 2. PII redaction on prompt ─────────────────────────────────────────────
  const piiResult = redactPii(truncatedPrompt);
  const safePrompt = piiResult.redacted;
  const piiRedacted = piiResult.hasMatches;

  if (piiRedacted) {
    console.warn('[ControlPlaneAI] PII detected and redacted from control-plane prompt', {
      adminId,
      requestId,
      categories: piiResult.categories,
      matchCount: piiResult.matchCount,
    });
  }

  // ── 3. Build final prompt ──────────────────────────────────────────────────
  const focusPart = focus ? ` Focus specifically on: ${focus}.` : '';
  const finalPrompt = `${safePrompt}${focusPart}`;

  // ── 4. Model invocation ────────────────────────────────────────────────────
  const inferenceStart = Date.now();
  const generation = await cpGenerateContent(finalPrompt);
  const inferenceLatencyMs = Date.now() - inferenceStart;

  // ── 5. Output PII scan ─────────────────────────────────────────────────────
  const outputScan = scanForPii(generation.text);
  const outputPiiDetected = outputScan.hasMatches;

  if (outputPiiDetected) {
    console.error('[ControlPlaneAI] PII detected in model output — output suppressed', {
      adminId,
      requestId,
      categories: outputScan.categories,
    });
    // Suppress the raw output; never return PII-containing model text
    generation.text =
      'AI output suppressed: potential PII detected in model response. Please refine your prompt.';
  }

  // ── 6. Admin audit write ───────────────────────────────────────────────────
  // Reasoning / prompt-summary artifact stored in metadataJson (NOT reasoning_logs).
  // Raw prompt content is NOT stored — only auditable metadata.
  const auditEntry = createAdminAudit(adminId, 'CONTROL_PLANE_AI_INSIGHTS', 'ai', {
    requestId,
    model: 'gemini-1.5-flash',
    tokensUsed: generation.tokensUsed,
    inferenceLatencyMs,
    hadInferenceError: generation.hadInferenceError,
    piiRedacted,
    outputPiiDetected,
    focus: focus ?? null,
    // Prompt fingerprint only — character count, not raw content
    promptChars: safePrompt.length,
    slice: 'G028-C1',
    timestamp: new Date().toISOString(),
  });

  // writeAuditLog is best-effort internally; failures are logged, not rethrown
  await writeAuditLog(prisma, auditEntry);

  // ── 7. Best-effort event emission ──────────────────────────────────────────
  // Reuse ai.inference.generate — existing KnownEventName, compatible payload.
  // No new ai.control.* event names in this unit.
  // orgId = ADMIN_SENTINEL_ORG — control-plane origin, not a tenant scope.
  void emitAiEventBestEffort(
    'ai.inference.generate',
    {
      orgId: ADMIN_SENTINEL_ORG,
      taskType: 'control-plane-insights',
      model: 'gemini-1.5-flash',
      latencyMs: inferenceLatencyMs,
    },
    { orgId: ADMIN_SENTINEL_ORG, actorId: adminId }
  );

  return {
    text: generation.text,
    tokensUsed: generation.tokensUsed,
    hadInferenceError: generation.hadInferenceError,
    inferenceLatencyMs,
    piiRedacted,
    outputPiiDetected,
  };
}
