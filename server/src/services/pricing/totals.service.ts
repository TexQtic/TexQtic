/**
 * G-010 — Canonical Phase-1 Totals Computation
 *
 * Behavior (documented, governed):
 *   tax     = 0  (Phase-1 default; no jurisdiction data; full tax engine out-of-scope)
 *   fees    = 0  (Phase-1 default; no platform fee configuration present)
 *   discount= 0  (Phase-1 default; no discount engine; CartItem has no discount field)
 *   rounding: round2() applied to each component individually, then grandTotal = sum of rounded parts
 *   grandTotal = subtotal - discountTotal + taxTotal + feeTotal
 *
 * Tenant safety: pure computation — no DB reads, no context, no side effects.
 * All config-based behavior requires explicit governance approval before adding.
 *
 * Stop-loss: throws TotalsInputError (with machine-readable .code) if any line item
 * has missing/invalid unitPrice or quantity, preventing silent wrong totals.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LineItem {
  /** Must be a finite number >= 0. Missing/NaN/negative triggers stop-loss. */
  unitPrice: number;
  /** Must be a positive integer >= 1. Non-integer or < 1 triggers stop-loss. */
  quantity: number;
}

export interface TotalsBreakdown {
  /** Applied tax line items. Empty array in Phase-1 (zero-rate). */
  tax: Array<{ code: string; amount: number; basis: number }>;
  /** Applied fee line items. Empty array in Phase-1 (zero-rate). */
  fees: Array<{ code: string; amount: number; basis?: number }>;
}

export interface Totals {
  /** ISO 4217 currency code, e.g. "USD". */
  currency: string;
  /** Sum of (unitPrice × quantity) for all items, rounded to 2dp. */
  subtotal: number;
  /** Sum of all item-level discounts. Phase-1: always 0. */
  discountTotal: number;
  /** subtotal − discountTotal (the base on which tax is applied). */
  taxableAmount: number;
  /** Total tax amount. Phase-1: always 0. */
  taxTotal: number;
  /** Total platform/service fee amount. Phase-1: always 0. */
  feeTotal: number;
  /** The canonical amount to charge: subtotal − discountTotal + taxTotal + feeTotal. */
  grandTotal: number;
  /** Line-by-line breakdown for rendering and auditing. */
  breakdown: TotalsBreakdown;
}

// ---------------------------------------------------------------------------
// Error class (stop-loss)
// ---------------------------------------------------------------------------

export class TotalsInputError extends Error {
  /** Machine-readable error code. */
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'TotalsInputError';
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Round to 2 decimal places using "round half up" (standard financial rounding).
 * Applied once per component — not sprinkled at each multiplication step.
 */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Canonical computation function
// ---------------------------------------------------------------------------

/**
 * Compute a deterministic, auditable totals object from a set of line items.
 *
 * Determinism guarantee: same inputs → always same outputs.
 * Rounding rule: round2() applied once to each component (subtotal, taxableAmount,
 * taxTotal, feeTotal, grandTotal). discountTotal is always 0 in Phase-1.
 *
 * @param items    Line items with unitPrice and quantity.
 * @param currency ISO 4217 currency code (default "USD").
 * @throws TotalsInputError if any item has invalid unitPrice or quantity.
 */
export function computeTotals(items: LineItem[], currency = 'USD'): Totals {
  // Stop-loss: validate all inputs before any arithmetic
  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (
      typeof item.unitPrice !== 'number' ||
      !Number.isFinite(item.unitPrice) ||
      item.unitPrice < 0
    ) {
      throw new TotalsInputError(
        'INVALID_UNIT_PRICE',
        `Line item at index ${i} has invalid unitPrice: ${item.unitPrice}`
      );
    }

    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new TotalsInputError(
        'INVALID_QUANTITY',
        `Line item at index ${i} has invalid quantity: ${item.quantity}`
      );
    }
  }

  // Phase-1 computation (all tax/fee/discount = 0)
  const subtotal = round2(
    items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  );

  const discountTotal = 0; // Phase-1: no discount engine
  const taxableAmount = round2(subtotal - discountTotal);
  const taxTotal = 0;      // Phase-1: no jurisdiction data
  const feeTotal = 0;      // Phase-1: no platform fee configuration
  const grandTotal = round2(taxableAmount + taxTotal + feeTotal);

  return {
    currency,
    subtotal,
    discountTotal,
    taxableAmount,
    taxTotal,
    feeTotal,
    grandTotal,
    breakdown: {
      tax: [],  // Phase-1 zero-rate: no tax lines
      fees: [], // Phase-1 zero-rate: no fee lines
    },
  };
}
