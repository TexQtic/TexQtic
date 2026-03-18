/**
 * TexQtic Escrow Service — Tenant Plane (TECS-FBW-003-A)
 *
 * READ-ONLY in this unit. Only list endpoint wired.
 * Mutation endpoints (create, record transaction, transition) are out of scope
 * for TECS-FBW-003-A and are NOT implemented here.
 *
 * D-017-A: tenantId is NEVER sent by the client in any request body.
 *           tenantGet() enforces the TENANT realm guard and sets X-Texqtic-Realm: tenant.
 *           The server derives tenantId exclusively from JWT claims (orgId).
 *
 * D-020-B: Balance is NOT derived from the list endpoint.
 *           The list response contains no balance field — it is only available
 *           from GET /api/tenant/escrows/:escrowId (out of scope for this unit).
 *           Do NOT display balance or synthesize it from list rows.
 */

import { tenantGet, tenantPost } from './tenantApiClient';

// ==================== G-018 ESCROW (TECS-FBW-003-A) ====================

/**
 * A single escrow account as returned by GET /api/tenant/escrows.
 *
 * Fields reflect the production response shape from escrow.service.ts
 * listEscrowAccounts() method. No balance field — D-020-B.
 */
export interface EscrowAccount {
  id: string;
  tenantId: string;
  currency: string;
  lifecycleStateId: string;
  /** Human-readable state key, e.g. DRAFT | ACTIVE | SETTLED | CLOSED | DISPUTED */
  lifecycleStateKey: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EscrowListParams {
  limit?: number;
  offset?: number;
}

/**
 * Response envelope from GET /api/tenant/escrows.
 * count reflects the number of rows returned in this page — not total DB count.
 */
export interface EscrowListResponse {
  escrows: EscrowAccount[];
  count: number;
  limit: number;
  offset: number;
}

/**
 * List escrow accounts for the authenticated tenant.
 *
 * D-017-A: No tenantId is included in this request — TENANT realm guard on
 *           tenantGet() is sufficient. The server scopes results to the JWT orgId.
 * D-020-B: The response does NOT include balance. Do not attempt to derive
 *           balance from this list response.
 *
 * @param params - Optional pagination params (limit, offset)
 * @returns EscrowListResponse
 */
export async function listEscrows(params?: EscrowListParams): Promise<EscrowListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));

  const qs = searchParams.toString();
  const endpoint = qs ? `/api/tenant/escrows?${qs}` : '/api/tenant/escrows';

  return tenantGet<EscrowListResponse>(endpoint);
}

// ==================== G-018 ESCROW MUTATIONS (TECS-FBW-003-B) ====================

/**
 * A single escrow ledger transaction row from GET /api/tenant/escrows/:escrowId.
 * amount is returned as string (NUMERIC(18,6) from Prisma $queryRaw).
 */
export interface EscrowDetailTransaction {
  id: string;
  tenantId: string;
  escrowId: string;
  entryType: string;
  direction: string;
  /** NUMERIC(18,6) from DB — returned as string by Prisma $queryRaw. */
  amount: string;
  currency: string;
  referenceId: string | null;
  metadata: Record<string, unknown>;
  createdByUserId: string | null;
  createdAt: string;
}

/**
 * Response envelope from GET /api/tenant/escrows/:escrowId.
 * D-020-B: balance is server-derived (SUM CREDIT − SUM DEBIT); never stored.
 */
export interface EscrowDetailResponse {
  escrow: EscrowAccount;
  /** Server-computed derived balance (D-020-B). Display-only; never mutate. */
  balance: number;
  /** Up to 20 most-recent ledger entries, newest first. */
  recentTransactions: EscrowDetailTransaction[];
}

/** Escrow ledger entry classification. ADJUSTMENT is restricted to elevated roles in the UI. */
export type TransactionEntryType = 'HOLD' | 'RELEASE' | 'REFUND' | 'ADJUSTMENT';

/** Direction of a ledger entry. CREDIT = funds in; DEBIT = funds out. */
export type TransactionDirection = 'CREDIT' | 'DEBIT';

/**
 * Input for POST /api/tenant/escrows.
 * D-017-A: tenantId is never sent — server derives from JWT.
 */
export interface CreateEscrowInput {
  /** ISO 4217 3-letter currency code. */
  currency: string;
  /** Mandatory justification (D-020-D). */
  reason: string;
}

export interface CreateEscrowResponse {
  escrowId: string;
}

/**
 * Input for POST /api/tenant/escrows/:escrowId/transactions.
 * D-017-A: tenantId never sent. D-020-C: aiTriggered is always false.
 * ADJUSTMENT must only be offered to elevated tenant roles (OWNER/ADMIN) in the UI.
 */
export interface RecordTransactionInput {
  entryType: TransactionEntryType;
  direction: TransactionDirection;
  /** Must be > 0. */
  amount: number;
  /** ISO 4217 currency code — must match the escrow account's denomination. */
  currency: string;
  /** Mandatory justification (D-020-D). */
  reason: string;
  /** Optional idempotency / reconciliation reference. */
  referenceId?: string | null;
}

export interface RecordTransactionResponse {
  transactionId: string;
  /** 'DUPLICATE_REFERENCE' when an idempotent duplicate was detected. */
  status?: string;
}

/**
 * Input for POST /api/tenant/escrows/:escrowId/transition.
 * D-017-A: tenantId never sent. D-020-C: aiTriggered always false.
 */
export interface TransitionInput {
  /** Target lifecycle state key (uppercase). */
  toStateKey: string;
  /** Mandatory justification (D-020-D). */
  reason: string;
  /** Actor role snapshot at call time. */
  actorRole: string;
}

/**
 * 2xx transition outcomes (APPLIED = HTTP 200, PENDING_APPROVAL = HTTP 202).
 * ESCALATION_REQUIRED and DENIED come back as APIError (HTTP 422, code STATE_MACHINE_DENIED).
 * ENTITY_FROZEN comes back as APIError (HTTP 423, code ENTITY_FROZEN).
 * Callers must catch APIError and inspect code / message to distinguish error outcomes.
 */
export type TransitionResponse =
  | { status: 'APPLIED'; fromStateKey: string; toStateKey: string; transitionId?: string | null }
  | { status: 'PENDING_APPROVAL'; fromStateKey: string; requiredActors: string[] };

/**
 * Retrieve escrow account detail including server-derived balance and recent transactions.
 * D-020-B: balance is always server-computed; display-only.
 *
 * @param escrowId - UUID of the escrow account.
 */
export async function getEscrowDetail(escrowId: string): Promise<EscrowDetailResponse> {
  return tenantGet<EscrowDetailResponse>(
    `/api/tenant/escrows/${encodeURIComponent(escrowId)}`,
  );
}

/**
 * Create a new escrow account in DRAFT lifecycle state.
 * D-017-A: tenantId is never sent — server derives from JWT (orgId).
 *
 * @param input - Currency and reason.
 */
export async function createEscrow(input: CreateEscrowInput): Promise<CreateEscrowResponse> {
  return tenantPost<CreateEscrowResponse>('/api/tenant/escrows', {
    currency: input.currency.toUpperCase().trim(),
    reason:   input.reason,
  });
}

/**
 * Record an append-only ledger entry for an escrow account.
 * ADJUSTMENT is restricted to elevated tenant roles (OWNER/ADMIN) — enforced in UI only.
 * D-017-A: tenantId never sent. D-020-C: aiTriggered is always false in this unit.
 *
 * @param escrowId - UUID of the escrow account.
 * @param input    - Entry fields.
 */
export async function recordEscrowTransaction(
  escrowId: string,
  input: RecordTransactionInput,
): Promise<RecordTransactionResponse> {
  return tenantPost<RecordTransactionResponse>(
    `/api/tenant/escrows/${encodeURIComponent(escrowId)}/transactions`,
    {
      entryType:   input.entryType,
      direction:   input.direction,
      amount:      input.amount,
      currency:    input.currency.toUpperCase().trim(),
      reason:      input.reason,
      referenceId: input.referenceId ?? null,
      metadata:    {},
      // D-020-C: aiTriggered is always false in TECS-FBW-003-B
    },
  );
}

/**
 * Trigger a lifecycle transition for an escrow account.
 * Returns APPLIED (HTTP 200) or PENDING_APPROVAL (HTTP 202) as TransitionResponse.
 * ESCALATION_REQUIRED / DENIED → APIError HTTP 422, code STATE_MACHINE_DENIED.
 * ENTITY_FROZEN → APIError HTTP 423, code ENTITY_FROZEN.
 * D-017-A: tenantId never sent. D-020-C: aiTriggered always false.
 *
 * @param escrowId - UUID of the escrow account.
 * @param input    - Target state key, reason, and actor role.
 */
export async function transitionEscrow(
  escrowId: string,
  input: TransitionInput,
): Promise<TransitionResponse> {
  return tenantPost<TransitionResponse>(
    `/api/tenant/escrows/${encodeURIComponent(escrowId)}/transition`,
    {
      toStateKey:  input.toStateKey.toUpperCase().trim(),
      reason:      input.reason,
      actorRole:   input.actorRole,
      aiTriggered: false, // D-020-C: always false in TECS-FBW-003-B
    },
  );
}
