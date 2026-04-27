/**
 * controlPlaneInferenceService.ts — PW5-G028-C1/C2-CONTROL-PLANE-AI-INSIGHTS
 *
 * Control-Plane Inference Service: Slices 1 & 2 for SUPER_ADMIN AI invocation.
 * Deliberately separate from tenant TIS (inferenceService.ts).
 *
 * Slice 1 scope (preserved):
 *   - Platform-level AI insights for SUPER_ADMIN only
 *   - Reasoning / prompt-summary persisted in admin audit metadataJson, NOT reasoning_logs
 *   - No tenant budget enforcement, no tenant rate-limit map, no idempotency window
 *   - PII redaction applied pre-send; output scanned for PII leak
 *   - Event emission: reuses ai.inference.generate only (no new ai.control.* names)
 *   - Event emission is always best-effort / non-blocking
 *
 * Slice 2 addition (PW5-G028-C2):
 *   - Optional targetOrgMeta (pre-validated by route) for per-org targeted mode
 *   - Bounded server-derived org context injected into prompt when present
 *   - Requests without targetOrgMeta preserve Slice 1 behavior exactly
 *
 * FORBIDDEN in this service (all slices):
 *   - Writing to reasoning_logs
 *   - Accepting client-trusted orgId / tenantId / role
 *   - Tenant budget, idempotency, or rate-limit paths
 *   - New ai.control.* event names
 *   - Reopening or refactoring inferenceService.ts
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { config } from '../../config/index.js';
import { writeAuditLog, createAdminAudit } from '../../lib/auditLog.js';
import { withSuperAdminContext } from '../../lib/database-context.js';
import { redactPii, scanForPii } from './piiGuard.js';
import { emitAiControlEventBestEffort } from '../../events/aiEmitter.js';

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

/** 15-minute idempotency bucket for pre-execution control-plane deduplication. */
const CP_FINGERPRINT_BUCKET_MS = 15 * 60 * 1_000;

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
 *
 * targetOrgMeta (Slice 2): when provided, must already be server-validated
 * by the route handler (DB lookup confirmed org exists). Never pass raw
 * client-supplied org data here.
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

  /**
   * Slice 2: optional validated org metadata for per-org targeted mode.
   * When present, bounded server-derived org context is injected into the prompt.
   * Must be pre-validated by the route handler (org existence confirmed) —
   * never populated from raw client input.
   */
  targetOrgMeta?: {
    id: string;
    slug: string;
    name: string;
    type: string;
    status: string;
  };
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
      model: 'gemini-2.5-flash',
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
 *   4. Admin audit record written with typed reasoning_log_id FK (G028-C3).
 *   5. reasoning_logs rows written with tenant_id = NULL, admin_actor_id set.
 *   6. Event emission is best-effort / non-blocking; failure never breaks the primary flow.
 *   7. No client-trusted identity signal is accepted or forwarded.
 *   8. No tenant budget, tenant reasoning_logs paths, or Slice 4 paths are invoked.
 *
 * C3 reasoning persistence flow:
 *   C1. Pre-execution: compute requestFingerprint = SHA256(safePrompt).
 *   C2. Idempotency guard: SELECT for existing finalized row before model invocation.
 *   C3. Finalized hit → reuse row, skip model, write audit, return early.
 *       Incomplete row → warn, do not reuse, proceed with fresh model invocation.
 *   C4. Model invocation on miss only.
 *   C5. Post-execution: compute reasoningHash = SHA256(safePrompt + response.text).
 *   C6. INSERT finalized reasoning row via withSuperAdminContext (tenant_id = NULL).
 *       P2002 conflict → fetch concurrent winner (only if finalized).
 *   C7. Write admin audit with reasoningLogId FK (omit if persistence degraded).
 */
export async function runControlPlaneInsight(input: CpInsightInput): Promise<CpInsightResult> {
  const { prompt: rawPrompt, focus, adminId, requestId, prisma, targetOrgMeta } = input;

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
    // Wire A — G028-C6: ai.control.insights.pii_redacted
    void emitAiControlEventBestEffort(
      'ai.control.insights.pii_redacted',
      {
        adminActorId: adminId,
        taskType: 'control-plane-insights',
        model: 'gemini-2.5-flash',
        fieldCount: piiResult.matchCount,
        requestId,
      },
      { adminActorId: adminId },
    );
  }

  // ── 3. Build final prompt ──────────────────────────────────────────────────
  const focusPart = focus ? ` Focus specifically on: ${focus}.` : '';
  // Slice 2: inject validated org context when a specific org is targeted.
  // Only server-derived fields from the tenant record are appended — never raw client input.
  const orgContextPart = targetOrgMeta
    ? ` [Targeted org context — platform-validated: name="${targetOrgMeta.name}", type=${targetOrgMeta.type}, status=${targetOrgMeta.status}]`
    : '';
  const finalPrompt = `${safePrompt}${focusPart}${orgContextPart}`;

  // ── C1. Pre-execution idempotency values (Decision 2 — before model invocation) ──
  // requestFingerprint = SHA256(safePrompt): uniquely identifies the prompt input.
  // requestBucketStart = current time normalised to 15-minute boundary.
  // These two values are the idempotency key together with adminId.
  const requestFingerprint = createHash('sha256').update(safePrompt).digest('hex');
  const nowMs = Date.now();
  const requestBucketStart = new Date(
    Math.floor(nowMs / CP_FINGERPRINT_BUCKET_MS) * CP_FINGERPRINT_BUCKET_MS,
  );

  // ── C2. Idempotency guard: SELECT for existing finalized row ───────────────
  // Must execute BEFORE model invocation to satisfy Decision 2 semantics.
  // Uses withSuperAdminContext to read control-plane rows (tenant_id IS NULL).
  // Admin-scoped: (admin_actor_id, request_fingerprint, request_bucket_start).
  let existingRow: { id: string; reasoningHash: string; responseSummary: string | null } | null =
    null;
  try {
    existingRow = await withSuperAdminContext(prisma, async tx => {
      return (tx as any).reasoningLog.findFirst({
        where: {
          adminActorId: adminId,
          requestFingerprint,
          requestBucketStart,
          tenantId: null,
        },
        select: { id: true, reasoningHash: true, responseSummary: true },
      });
    });
  } catch (idempotencyCheckErr) {
    // Non-blocking: if the check fails, proceed with fresh invocation.
    console.warn('[ControlPlaneAI] Idempotency pre-check error (proceeding fresh):', {
      adminId,
      requestId,
      error: idempotencyCheckErr,
    });
  }

  // ── C3. Handle existing row (Decision 2 / CP-07) ───────────────────────────
  // A row is "finalized and safe to reuse" only when:
  //   - reasoningHash is populated (non-empty string)
  //   - responseSummary is present (not null/undefined)
  // An incomplete placeholder row must NOT be silently reused (CP-07).
  let reasoningLogId: string | undefined;

  if (existingRow) {
    const isFinalized =
      existingRow.reasoningHash &&
      existingRow.reasoningHash.length > 0 &&
      existingRow.responseSummary !== null &&
      existingRow.responseSummary !== undefined;

    if (isFinalized) {
      // Safe finalized row found → reuse without model invocation.
      reasoningLogId = existingRow.id;

      const earlyAuditEntry = createAdminAudit(
        adminId,
        'CONTROL_PLANE_AI_INSIGHTS',
        'ai',
        {
          requestId,
          model: 'gemini-2.5-flash',
          tokensUsed: 0,
          inferenceLatencyMs: 0,
          hadInferenceError: false,
          piiRedacted,
          outputPiiDetected: false,
          focus: focus ?? null,
          promptChars: safePrompt.length,
          slice: targetOrgMeta ? 'G028-C2' : 'G028-C1',
          targetMode: targetOrgMeta ? 'per-org' : 'platform-global',
          targetOrgId: targetOrgMeta?.id ?? null,
          timestamp: new Date().toISOString(),
          idempotencyHit: true,
        },
        reasoningLogId,
      );

      await writeAuditLog(prisma, earlyAuditEntry);

      // Wire B — G028-C6: ai.control.insights.generate (idempotency-hit early return)
      void emitAiControlEventBestEffort(
        'ai.control.insights.generate',
        {
          adminActorId: adminId,
          taskType: 'control-plane-insights',
          model: 'gemini-2.5-flash',
          latencyMs: 0,
          requestId,
          ...(targetOrgMeta?.id !== undefined ? { targetOrgId: targetOrgMeta.id } : {}),
          ...(reasoningLogId !== undefined ? { reasoningLogId } : {}),
        },
        { adminActorId: adminId },
      );

      return {
        text: existingRow.responseSummary ?? '[Cached AI response]',
        tokensUsed: 0,
        hadInferenceError: false,
        inferenceLatencyMs: 0,
        piiRedacted,
        outputPiiDetected: false,
      };
    } else {
      // Incomplete row found — do not silently reuse (CP-07 contract).
      // Proceed with fresh model invocation. The INSERT in C6 will encounter
      // a unique conflict if the incomplete row holds the idempotency slot —
      // that is handled as a degraded mode (no reasoningLogId in audit).
      console.warn(
        '[ControlPlaneAI] Incomplete reasoning row found for idempotency key — not reusing',
        {
          adminId,
          requestId,
          existingRowId: existingRow.id,
        },
      );
    }
  }

  // ── C4. Model invocation (miss path only) ──────────────────────────────────
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
    // Suppress the raw output; never return PII-containing model text.
    generation.text =
      'AI output suppressed: potential PII detected in model response. Please refine your prompt.';
    // Wire C — G028-C6: ai.control.insights.pii_leak_detected
    void emitAiControlEventBestEffort(
      'ai.control.insights.pii_leak_detected',
      {
        adminActorId: adminId,
        taskType: 'control-plane-insights',
        model: 'gemini-2.5-flash',
        leakType: outputScan.categories.join(','),
        requestId,
      },
      { adminActorId: adminId },
    );
  }

  // ── C5. Post-execution artifact hash (Decision 2) ──────────────────────────
  // reasoningHash = SHA256(safePrompt + generation.text) — artifact integrity only.
  // This is NOT part of the idempotency key (requestFingerprint is).
  const reasoningHash = createHash('sha256')
    .update(safePrompt + generation.text)
    .digest('hex');

  // ── C6. Insert finalized reasoning row (Decision 1) ───────────────────────
  // tenant_id = NULL (control-plane row, not tenant-scoped).
  // admin_actor_id = adminId (from verified JWT only).
  // All values are final — the immutability trigger forbids UPDATE.
  // P2002 conflict means a concurrent request inserted the same idempotency key.
  try {
    const insertedLog = await withSuperAdminContext(prisma, async tx => {
      return (tx as any).reasoningLog.create({
        data: {
          tenantId: null,
          adminActorId: adminId,
          requestId,
          requestFingerprint,
          requestBucketStart,
          reasoningHash,
          model: 'gemini-2.5-flash',
          promptSummary: safePrompt.slice(0, 200),
          responseSummary: generation.text.slice(0, 500),
          tokensUsed: generation.tokensUsed,
        },
        select: { id: true },
      });
    });
    reasoningLogId = insertedLog.id;
  } catch (persistErr: any) {
    if (persistErr?.code === 'P2002') {
      // Unique constraint violation: a concurrent request won the INSERT race.
      // Fetch the winner row — only adopt its ID if it is a finalized row
      // (guards against the case where an incomplete row holds the idempotency slot).
      try {
        const conflictRow = await withSuperAdminContext(prisma, async tx => {
          return (tx as any).reasoningLog.findFirst({
            where: {
              adminActorId: adminId,
              requestFingerprint,
              requestBucketStart,
              tenantId: null,
            },
            select: { id: true, reasoningHash: true, responseSummary: true },
          });
        });
        if (
          conflictRow &&
          conflictRow.reasoningHash &&
          conflictRow.reasoningHash.length > 0 &&
          conflictRow.responseSummary !== null
        ) {
          // Finalized concurrent winner — safe to link.
          reasoningLogId = conflictRow.id;
        } else {
          // Incomplete row holds the slot — degraded mode, omit reasoningLogId.
          console.warn(
            '[ControlPlaneAI] Incomplete row holds idempotency slot after P2002 — omitting reasoningLogId',
            { adminId, requestId },
          );
        }
      } catch (fetchErr) {
        console.warn('[ControlPlaneAI] Failed to fetch conflict reasoning row:', fetchErr);
      }
    } else {
      // Non-conflict persistence failure — degraded mode, primary AI response unaffected.
      console.warn('[ControlPlaneAI] Reasoning persistence failed (degraded mode):', {
        adminId,
        requestId,
        error: persistErr,
      });
    }
  }

  // ── C7. Admin audit write with reasoning log FK linkage (Decision 3) ───────
  // reasoningLogId is threaded through createAdminAudit → writeAuditLog.
  // If persistence was degraded (no reasoningLogId), the audit row is written
  // without the FK — this is the permitted degraded path.
  const auditEntry = createAdminAudit(
    adminId,
    'CONTROL_PLANE_AI_INSIGHTS',
    'ai',
    {
      requestId,
      model: 'gemini-2.5-flash',
      tokensUsed: generation.tokensUsed,
      inferenceLatencyMs,
      hadInferenceError: generation.hadInferenceError,
      piiRedacted,
      outputPiiDetected,
      focus: focus ?? null,
      promptChars: safePrompt.length,
      slice: targetOrgMeta ? 'G028-C2' : 'G028-C1',
      targetMode: targetOrgMeta ? 'per-org' : 'platform-global',
      targetOrgId: targetOrgMeta?.id ?? null,
      timestamp: new Date().toISOString(),
    },
    reasoningLogId,
  );

  // writeAuditLog is best-effort internally; failures are logged, not rethrown.
  await writeAuditLog(prisma, auditEntry);

  // ── 8. Best-effort event emission — Wire D (G028-C6) ────────────────────────
  // Mutually exclusive: emit generate on success, error on inference failure.
  if (!generation.hadInferenceError) {
    void emitAiControlEventBestEffort(
      'ai.control.insights.generate',
      {
        adminActorId: adminId,
        taskType: 'control-plane-insights',
        model: 'gemini-2.5-flash',
        latencyMs: inferenceLatencyMs,
        requestId,
        ...(targetOrgMeta?.id !== undefined ? { targetOrgId: targetOrgMeta.id } : {}),
        ...(reasoningLogId !== undefined ? { reasoningLogId } : {}),
      },
      { adminActorId: adminId },
    );
  } else {
    void emitAiControlEventBestEffort(
      'ai.control.insights.error',
      {
        adminActorId: adminId,
        taskType: 'control-plane-insights',
        model: 'gemini-2.5-flash',
        errorCode: 'CP_AI_INFERENCE_ERROR',
        errorMessage: generation.text,
        requestId,
        ...(targetOrgMeta?.id !== undefined ? { targetOrgId: targetOrgMeta.id } : {}),
      },
      { adminActorId: adminId },
    );
  }

  return {
    text: generation.text,
    tokensUsed: generation.tokensUsed,
    hadInferenceError: generation.hadInferenceError,
    inferenceLatencyMs,
    piiRedacted,
    outputPiiDetected,
  };
}
