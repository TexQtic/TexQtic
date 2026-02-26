/**
 * G-019 — SettlementService Guardrails (Day 1)
 * Task ID: G-019-DAY1-SETTLEMENT-SERVICE
 * Doctrine v1.4 + D-020-C (AI boundary) + G-019 Toggle C3 (dispute policy)
 *
 * Pure helper functions — no DB, no side effects, fully testable in isolation.
 * Mirrors the structural pattern established in G-018 escrow.guardrails.ts.
 *
 * Constitutional guarantees:
 *   D-020-C: AI-triggered settlement requires explicit human confirmation signal.
 *   TOGGLE_C=C3: DISPUTED trade state is a hard semantic blocker at service layer.
 */

// ─── Amount Validator ─────────────────────────────────────────────────────────

/**
 * Returns true if `amount` is a finite positive number greater than 0.
 * Mirrors the DB CHECK constraint: amount > 0 on escrow_transactions.
 */
export function validateAmount(amount: unknown): amount is number {
  return typeof amount === 'number' && Number.isFinite(amount) && amount > 0;
}

// ─── Currency Validator ───────────────────────────────────────────────────────

/**
 * Returns true if `currency` is a non-empty string.
 * Denomination validation (ISO 4217 conformance) is a caller concern;
 * this guard only ensures the field is present and non-blank.
 */
export function validateCurrency(currency: unknown): currency is string {
  return typeof currency === 'string' && currency.trim().length > 0;
}

// ─── ReferenceId Validator ────────────────────────────────────────────────────

/**
 * Returns true if `referenceId` is a non-empty string.
 * TOGGLE_B = B1: referenceId carries the idempotency / reconciliation signal
 * for the ledger-only settlement model. Must be present and non-blank.
 */
export function validateReferenceId(referenceId: unknown): referenceId is string {
  return typeof referenceId === 'string' && referenceId.trim().length > 0;
}

// ─── AI Boundary Enforcer ─────────────────────────────────────────────────────

/**
 * D-020-C: Enforces the AI human-confirmation boundary.
 *
 * Returns an error message string if the call violates the AI boundary,
 * or null if the call is allowed.
 *
 * Escrow-strict mode (consistent with G-018):
 *   aiTriggered=true ALWAYS requires "HUMAN_CONFIRMED:" in reason,
 *   regardless of actorType (no SYSTEM_AUTOMATION exemption for settlement).
 *
 * @param aiTriggered - Whether an AI recommendation preceded this action.
 * @param reason      - Mandatory justification string from the caller.
 * @returns Error message string | null
 */
export function enforceAiBoundary(aiTriggered: boolean, reason: string): string | null {
  if (aiTriggered && !reason.includes('HUMAN_CONFIRMED:')) {
    return (
      'Settlement requires explicit human confirmation when aiTriggered=true. ' +
      'The reason field must contain the "HUMAN_CONFIRMED:" marker. ' +
      'Example: "HUMAN_CONFIRMED: Settlement authorised by trade desk on 2026-02-26." ' +
      '[D-020-C, G-019 AI boundary]'
    );
  }
  return null;
}

// ─── Dispute Policy Enforcer ──────────────────────────────────────────────────

/**
 * TOGGLE_C = C3: Enforces the dispute semantic policy.
 *
 * Returns an error message if the trade is in DISPUTED state (blocking settlement),
 * or null if the state allows settlement to proceed.
 *
 * Note: This is Layer 1 of the C3 dual-enforcement model.
 * Layer 2 (escalation freeze gate via EscalationService.checkEntityFreeze)
 * is enforced in the service pipeline (Step 2 — before this check).
 *
 * @param tradeLifecycleStateKey - Current lifecycle state key of the trade.
 * @returns Error message string | null
 */
export function enforceDisputePolicy(tradeLifecycleStateKey: string): string | null {
  if (tradeLifecycleStateKey === 'DISPUTED') {
    return (
      'Trade is in DISPUTED state. Settlement is blocked until the dispute is resolved. ' +
      'Resolve or escalate the dispute via the appropriate API before retrying settlement. ' +
      '[G-019 TOGGLE_C=C3, Step 3: DISPUTED semantic blocker]'
    );
  }
  return null;
}
