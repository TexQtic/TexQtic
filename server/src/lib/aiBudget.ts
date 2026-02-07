import type { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * AI Budget Enforcement & Usage Metering
 *
 * Enforces token and cost limits per tenant, tracks monthly usage,
 * and implements hard-stop behavior when budgets are exceeded.
 */

// Configuration (can be overridden via env vars)
const AI_COST_PER_1K_TOKENS_USD = parseFloat(process.env.AI_COST_PER_1K_TOKENS_USD || '0.002');
const AI_BUDGET_DEFAULT_TOKENS = parseInt(process.env.AI_BUDGET_DEFAULT_TOKENS || '50000', 10);
const AI_BUDGET_DEFAULT_HARD_STOP = process.env.AI_BUDGET_DEFAULT_HARD_STOP !== 'false';

export interface BudgetPolicy {
  tenantId: string;
  monthlyLimitTokens: number;
  hardStop: boolean;
}

export interface UsageSnapshot {
  tenantId: string;
  month: string;
  tokens: number;
  costEstimate: number; // USD
}

export class BudgetExceededError extends Error {
  constructor(
    public tenantId: string,
    public limits: { tokens: number; cost: number },
    public usage: { tokens: number; cost: number },
    public resetAt: string
  ) {
    super(
      `AI budget exceeded for tenant ${tenantId}. Usage: ${usage.tokens}/${limits.tokens} tokens, $${usage.cost.toFixed(4)}. Resets: ${resetAt}`
    );
    this.name = 'BudgetExceededError';
  }

  toJSON() {
    return {
      ok: false,
      error: 'AI_BUDGET_EXCEEDED',
      message: this.message,
      limits: this.limits,
      usage: this.usage,
      resetAt: this.resetAt,
    };
  }
}

/**
 * Get current month key in YYYY-MM format (UTC)
 */
export function getMonthKey(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get first day of next month (for resetAt calculation)
 */
export function getNextMonthISO(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const nextMonth = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
  return nextMonth.toISOString();
}

/**
 * Estimate cost in USD for given token count and model
 *
 * @param tokens - Number of tokens consumed
 * @param model - Model name (for future per-model pricing)
 * @returns Cost in USD
 */
export function estimateCostUSD(tokens: number, _model: string = 'gemini-1.5-flash'): number {
  // Simple linear pricing: $0.002 per 1K tokens (configurable)
  // Future: use model-specific pricing table
  return (tokens / 1000) * AI_COST_PER_1K_TOKENS_USD;
}

/**
 * Load tenant's AI budget policy from database
 *
 * @param tx - Prisma transaction client
 * @param tenantId - Tenant UUID
 * @returns Budget policy or default if not configured
 */
export async function loadTenantBudget(tx: PrismaClient, tenantId: string): Promise<BudgetPolicy> {
  const budget = await tx.aiBudget.findUnique({
    where: { tenantId },
    select: { monthlyLimit: true, hardStop: true },
  });

  if (budget) {
    return {
      tenantId,
      monthlyLimitTokens: budget.monthlyLimit,
      hardStop: budget.hardStop,
    };
  }

  // Default budget if not configured
  return {
    tenantId,
    monthlyLimitTokens: AI_BUDGET_DEFAULT_TOKENS,
    hardStop: AI_BUDGET_DEFAULT_HARD_STOP,
  };
}

/**
 * Get current month's usage for tenant
 *
 * @param tx - Prisma transaction client
 * @param tenantId - Tenant UUID
 * @param month - Month key (YYYY-MM)
 * @returns Current usage snapshot
 */
export async function getUsage(
  tx: PrismaClient,
  tenantId: string,
  month: string
): Promise<UsageSnapshot> {
  const usage = await tx.aiUsageMeter.findUnique({
    where: {
      tenantId_month: { tenantId, month },
    },
    select: { tokens: true, costEstimate: true },
  });

  if (usage) {
    return {
      tenantId,
      month,
      tokens: usage.tokens,
      costEstimate: usage.costEstimate.toNumber(),
    };
  }

  // No usage this month yet
  return {
    tenantId,
    month,
    tokens: 0,
    costEstimate: 0,
  };
}

/**
 * Enforce budget limits BEFORE making AI call
 *
 * Throws BudgetExceededError if hard stop enabled and limits would be exceeded.
 *
 * @param budget - Tenant's budget policy
 * @param usage - Current usage snapshot
 * @param addTokens - Tokens about to be consumed
 * @param addCost - Cost about to be incurred
 * @throws BudgetExceededError if hard stop enabled and budget exceeded
 */
export function enforceBudgetOrThrow(
  budget: BudgetPolicy,
  usage: UsageSnapshot,
  addTokens: number,
  addCost: number
): void {
  const projectedTokens = usage.tokens + addTokens;
  const projectedCost = usage.costEstimate + addCost;

  if (!budget.hardStop) {
    // Soft limit: allow but log warning
    if (projectedTokens > budget.monthlyLimitTokens) {
      console.warn(
        `[AI Budget] Tenant ${budget.tenantId} exceeding soft limit: ${projectedTokens}/${budget.monthlyLimitTokens} tokens`
      );
    }
    return; // Allow request
  }

  // Hard stop: enforce strict limit
  if (projectedTokens > budget.monthlyLimitTokens) {
    throw new BudgetExceededError(
      budget.tenantId,
      { tokens: budget.monthlyLimitTokens, cost: estimateCostUSD(budget.monthlyLimitTokens) },
      { tokens: projectedTokens, cost: projectedCost },
      getNextMonthISO()
    );
  }
}

/**
 * Update usage meter after AI call completes
 *
 * Uses upsert to create or increment monthly usage record.
 *
 * @param tx - Prisma transaction client
 * @param tenantId - Tenant UUID
 * @param month - Month key (YYYY-MM)
 * @param addTokens - Tokens consumed in this call
 * @param addCost - Cost incurred in this call
 */
export async function upsertUsage(
  tx: PrismaClient,
  tenantId: string,
  month: string,
  addTokens: number,
  addCost: number
): Promise<void> {
  await tx.aiUsageMeter.upsert({
    where: {
      tenantId_month: { tenantId, month },
    },
    create: {
      tenantId,
      month,
      tokens: addTokens,
      costEstimate: new Decimal(addCost),
    },
    update: {
      tokens: { increment: addTokens },
      costEstimate: { increment: new Decimal(addCost) },
    },
  });
}
