/**
 * InvoiceService — TTP Slice 4: Invoice Domain
 *
 * Governs invoice lifecycle for TradeTrust Pay.
 * Uses Prisma snake_case models (invoices, invoice_lifecycle_logs) via `(db as any)`.
 * Uses camelCase models (lifecycleState, trade, featureFlag) via standard client.
 *
 * DB rule: lifecycle_state_id is a FK to lifecycle_states.id — always resolved by
 * (entityType='INVOICE', stateKey=<key>) before insert/update.
 *
 * Buyer visibility: BuyerInvoiceRecord MUST NOT expose credit/risk/admin fields.
 *
 * D-017-A: org_id is ALWAYS from JWT/dbContext — never from caller body.
 * D-020-C: ai_triggered=true requires reason starting with 'HUMAN_CONFIRMED:'.
 */

import { randomUUID } from 'crypto';
import type { PrismaClient } from '@prisma/client';
import {
  TTP_INVOICE_STATE,
  TTP_ACTOR_TYPE,
  TTP_FEATURE_FLAG,
  TTP_ENTITY_TYPE,
} from '../ttp/ttp.constants.js';

// ─── Error Classes ──────────────────────────────────────────────────────────────

export class InvoiceNotFoundError extends Error {
  constructor() {
    super('Invoice not found');
    this.name = 'InvoiceNotFoundError';
  }
}

export class InvoiceTradeNotFoundError extends Error {
  constructor() {
    super('Trade not found');
    this.name = 'InvoiceTradeNotFoundError';
  }
}

export class InvoiceSellerMismatchError extends Error {
  constructor() {
    super('Trade seller does not match the authenticated organization');
    this.name = 'InvoiceSellerMismatchError';
  }
}

export class InvoiceCurrencyMismatchError extends Error {
  constructor() {
    super('Invoice currency must match trade currency');
    this.name = 'InvoiceCurrencyMismatchError';
  }
}

export class InvoiceDuplicateNumberError extends Error {
  constructor() {
    super('An invoice with this invoice_number already exists for this trade');
    this.name = 'InvoiceDuplicateNumberError';
  }
}

export class InvoiceTerminalStateError extends Error {
  constructor(stateKey: string) {
    super(`Invoice is in terminal state '${stateKey}' and cannot be transitioned`);
    this.name = 'InvoiceTerminalStateError';
  }
}

export class InvoiceTransitionNotAllowedError extends Error {
  constructor(from: string, to: string) {
    super(`Transition from '${from}' to '${to}' is not permitted for this actor`);
    this.name = 'InvoiceTransitionNotAllowedError';
  }
}

export class InvoiceMakerCheckerRequiredError extends Error {
  constructor() {
    super(
      'High-value invoice: maker_user_id and checker_user_id are both required for VERIFIED transition (OQ-TTP-003)',
    );
    this.name = 'InvoiceMakerCheckerRequiredError';
  }
}

export class InvoiceBuyerMismatchError extends Error {
  constructor() {
    super('Invoice buyer does not match the authenticated organization');
    this.name = 'InvoiceBuyerMismatchError';
  }
}

export class InvoiceBuyerActionNotAllowedError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'InvoiceBuyerActionNotAllowedError';
  }
}

// ─── Input / Record Interfaces ──────────────────────────────────────────────────

export interface CreateInvoiceInput {
  trade_id: string;
  invoice_number: string;
  invoice_date: string; // ISO date string
  due_date?: string | null;
  currency: string;
  gross_amount: number;
  document_url?: string | null;
  notes?: string | null;
}

/** Seller-visible invoice record. No credit/risk/admin internals. */
export interface TenantInvoiceRecord {
  id: string;
  org_id: string;
  buyer_org_id: string;
  trade_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  currency: string;
  gross_amount: string;
  state_key: string;
  document_url: string | null;
  notes: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Buyer-visible invoice record.
 * MUST NOT include: credit assessment data, CIBIL, internal risk notes,
 * partner-routing stubs, finance-readiness payload, internal org UUIDs,
 * admin-only notes, seller notes.
 */
export interface BuyerInvoiceRecord {
  id: string;
  trade_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  currency: string;
  gross_amount: string;
  state_key: string;
  document_url: string | null;
  created_at: string;
}

/** Admin-visible invoice record — full fields. */
export interface AdminInvoiceRecord {
  id: string;
  org_id: string;
  buyer_org_id: string;
  trade_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  currency: string;
  gross_amount: string;
  state_key: string;
  document_url: string | null;
  notes: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminTransitionInput {
  to_state_key: string;
  reason: string;
  maker_user_id?: string | null;
  checker_user_id?: string | null;
}

export interface InvoiceListFilters {
  trade_id?: string;
  state_key?: string;
}

export interface AdminInvoiceListFilters {
  org_id?: string;
  trade_id?: string;
  state_key?: string;
  limit?: number;
  offset?: number;
}

// ─── Constants (local) ──────────────────────────────────────────────────────────

const ENTITY_INVOICE = TTP_ENTITY_TYPE.INVOICE;

/**
 * Seeded allowed_transitions: tenant user may only submit (DRAFT→SUBMITTED).
 * WITHDRAWN from DRAFT/SUBMITTED requires TENANT_ADMIN role (not implemented here —
 * tenant route restricts to DRAFT→SUBMITTED only for TENANT_USER actor).
 */
const TENANT_USER_ALLOWED_TO: ReadonlySet<string> = new Set([TTP_INVOICE_STATE.SUBMITTED]);

/**
 * States from which buyer (TENANT_USER in buyer context) may raise a dispute.
 * From §34: SUBMITTED→DISPUTED and UNDER_REVIEW→DISPUTED (TENANT_USER, TENANT_ADMIN).
 */
const BUYER_DISPUTABLE_FROM: ReadonlySet<string> = new Set([
  TTP_INVOICE_STATE.SUBMITTED,
  TTP_INVOICE_STATE.UNDER_REVIEW,
]);

/** Default MC threshold (INR) if feature flag is absent or unparseable. */
const DEFAULT_MC_THRESHOLD_INR = 500_000;

// ─── Service ────────────────────────────────────────────────────────────────────

export class InvoiceService {
  constructor(private readonly db: PrismaClient) {}

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async resolveLifecycleStateId(stateKey: string): Promise<string> {
    const row = await this.db.lifecycleState.findFirst({
      where: { entityType: ENTITY_INVOICE, stateKey },
      select: { id: true },
    });
    if (!row) throw new Error(`Lifecycle state not found: INVOICE/${stateKey}`);
    return row.id;
  }

  private async resolveCurrentState(
    lifecycleStateId: string,
  ): Promise<{ stateKey: string; isTerminal: boolean }> {
    const row = await this.db.lifecycleState.findFirst({
      where: { id: lifecycleStateId },
      select: { stateKey: true, isTerminal: true },
    });
    if (!row)
      throw new Error(`Lifecycle state row missing for id ${lifecycleStateId}`);
    return { stateKey: row.stateKey, isTerminal: row.isTerminal };
  }

  private async resolveMcThresholdInr(): Promise<number> {
    try {
      const flag = await this.db.featureFlag.findUnique({
        where: { key: TTP_FEATURE_FLAG.MAKER_CHECKER_THRESHOLD_INR },
        select: { enabled: true, value: true },
      });
      if (!flag || !flag.enabled || !flag.value) return DEFAULT_MC_THRESHOLD_INR;
      const parsed = parseFloat(flag.value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MC_THRESHOLD_INR;
    } catch {
      return DEFAULT_MC_THRESHOLD_INR;
    }
  }

  private toTenantRecord(inv: Record<string, unknown>, stateKey: string): TenantInvoiceRecord {
    return {
      id: String(inv['id']),
      org_id: String(inv['org_id']),
      buyer_org_id: String(inv['buyer_org_id']),
      trade_id: String(inv['trade_id']),
      invoice_number: String(inv['invoice_number']),
      invoice_date: (inv['invoice_date'] as Date).toISOString(),
      due_date: inv['due_date'] ? (inv['due_date'] as Date).toISOString() : null,
      currency: String(inv['currency']),
      gross_amount: String(inv['gross_amount']),
      state_key: stateKey,
      document_url: inv['document_url'] ? String(inv['document_url']) : null,
      notes: inv['notes'] ? String(inv['notes']) : null,
      created_by_user_id: inv['created_by_user_id']
        ? String(inv['created_by_user_id'])
        : null,
      created_at: (inv['created_at'] as Date).toISOString(),
      updated_at: (inv['updated_at'] as Date).toISOString(),
    };
  }

  private toBuyerRecord(inv: Record<string, unknown>, stateKey: string): BuyerInvoiceRecord {
    // Strict buyer projection — no seller org_id, no notes, no admin fields
    return {
      id: String(inv['id']),
      trade_id: String(inv['trade_id']),
      invoice_number: String(inv['invoice_number']),
      invoice_date: (inv['invoice_date'] as Date).toISOString(),
      due_date: inv['due_date'] ? (inv['due_date'] as Date).toISOString() : null,
      currency: String(inv['currency']),
      gross_amount: String(inv['gross_amount']),
      state_key: stateKey,
      document_url: inv['document_url'] ? String(inv['document_url']) : null,
      created_at: (inv['created_at'] as Date).toISOString(),
    };
  }

  private toAdminRecord(inv: Record<string, unknown>, stateKey: string): AdminInvoiceRecord {
    return {
      id: String(inv['id']),
      org_id: String(inv['org_id']),
      buyer_org_id: String(inv['buyer_org_id']),
      trade_id: String(inv['trade_id']),
      invoice_number: String(inv['invoice_number']),
      invoice_date: (inv['invoice_date'] as Date).toISOString(),
      due_date: inv['due_date'] ? (inv['due_date'] as Date).toISOString() : null,
      currency: String(inv['currency']),
      gross_amount: String(inv['gross_amount']),
      state_key: stateKey,
      document_url: inv['document_url'] ? String(inv['document_url']) : null,
      notes: inv['notes'] ? String(inv['notes']) : null,
      created_by_user_id: inv['created_by_user_id']
        ? String(inv['created_by_user_id'])
        : null,
      created_at: (inv['created_at'] as Date).toISOString(),
      updated_at: (inv['updated_at'] as Date).toISOString(),
    };
  }

  private async writeLifecycleLog(params: {
    orgId: string;
    invoiceId: string;
    fromStateKey: string | null;
    toStateKey: string;
    actorUserId: string | null;
    actorAdminId: string | null;
    actorType: string;
    actorRole: string;
    reason: string;
    makerUserId?: string | null;
    checkerUserId?: string | null;
    requestId?: string | null;
  }): Promise<void> {
    await (this.db as any).invoice_lifecycle_logs.create({
      data: {
        org_id: params.orgId,
        invoice_id: params.invoiceId,
        from_state_key: params.fromStateKey,
        to_state_key: params.toStateKey,
        actor_user_id: params.actorUserId ?? null,
        actor_admin_id: params.actorAdminId ?? null,
        actor_type: params.actorType,
        actor_role: params.actorRole,
        maker_user_id: params.makerUserId ?? null,
        checker_user_id: params.checkerUserId ?? null,
        reason: params.reason,
        request_id: params.requestId ?? null,
        created_at: new Date(),
      },
    });
  }

  // ── Seller (tenant) methods ─────────────────────────────────────────────────

  async createInvoice(
    orgId: string,
    userId: string | null,
    data: CreateInvoiceInput,
  ): Promise<TenantInvoiceRecord> {
    // 1. Verify trade exists and seller org matches
    const trade = await this.db.trade.findUnique({
      where: { id: data.trade_id },
      select: { id: true, sellerOrgId: true, buyerOrgId: true, currency: true },
    });
    if (!trade) throw new InvoiceTradeNotFoundError();
    if (trade.sellerOrgId !== orgId) throw new InvoiceSellerMismatchError();

    // 2. Currency must match trade
    if (data.currency !== trade.currency) throw new InvoiceCurrencyMismatchError();

    // 3. Check duplicate invoice_number for this (org_id, trade_id)
    const existing = await (this.db as any).invoices.findFirst({
      where: {
        org_id: orgId,
        trade_id: data.trade_id,
        invoice_number: data.invoice_number,
      },
      select: { id: true },
    });
    if (existing) throw new InvoiceDuplicateNumberError();

    // 4. Resolve DRAFT lifecycle state id
    const draftStateId = await this.resolveLifecycleStateId(TTP_INVOICE_STATE.DRAFT);

    // 5. Create invoice
    const inv = await (this.db as any).invoices.create({
      data: {
        id: randomUUID(),
        org_id: orgId,
        buyer_org_id: trade.buyerOrgId,
        trade_id: data.trade_id,
        invoice_number: data.invoice_number,
        invoice_date: new Date(data.invoice_date),
        due_date: data.due_date ? new Date(data.due_date) : null,
        currency: data.currency,
        gross_amount: data.gross_amount,
        lifecycle_state_id: draftStateId,
        document_url: data.document_url ?? null,
        notes: data.notes ?? null,
        created_by_user_id: userId ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // 6. Write creation log
    await this.writeLifecycleLog({
      orgId,
      invoiceId: inv.id,
      fromStateKey: null,
      toStateKey: TTP_INVOICE_STATE.DRAFT,
      actorUserId: userId,
      actorAdminId: null,
      actorType: TTP_ACTOR_TYPE.TENANT_USER,
      actorRole: 'SELLER',
      reason: 'Invoice created',
      requestId: randomUUID(),
    });

    return this.toTenantRecord(inv, TTP_INVOICE_STATE.DRAFT);
  }

  async listInvoices(
    orgId: string,
    filters?: InvoiceListFilters,
  ): Promise<TenantInvoiceRecord[]> {
    const where: Record<string, unknown> = { org_id: orgId };
    if (filters?.trade_id) where['trade_id'] = filters.trade_id;

    const rows = await (this.db as any).invoices.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    // Resolve state keys for all invoices
    const records: TenantInvoiceRecord[] = [];
    for (const row of rows) {
      const state = await this.resolveCurrentState(String(row['lifecycle_state_id']));
      if (filters?.state_key && state.stateKey !== filters.state_key) continue;
      records.push(this.toTenantRecord(row, state.stateKey));
    }
    return records;
  }

  async getInvoice(orgId: string, invoiceId: string): Promise<TenantInvoiceRecord> {
    const inv = await (this.db as any).invoices.findFirst({
      where: { id: invoiceId, org_id: orgId },
    });
    if (!inv) throw new InvoiceNotFoundError();
    const state = await this.resolveCurrentState(String(inv['lifecycle_state_id']));
    return this.toTenantRecord(inv, state.stateKey);
  }

  /**
   * Tenant seller lifecycle transition.
   * From §34 seeds:
   *   DRAFT→SUBMITTED: TENANT_USER, TENANT_ADMIN
   *   (WITHDRAWN transitions require TENANT_ADMIN — not in this method; use separate admin route)
   */
  async tenantTransition(
    orgId: string,
    invoiceId: string,
    toStateKey: string,
    reason: string,
    userId: string | null,
  ): Promise<TenantInvoiceRecord> {
    // 1. Load invoice (seller scope)
    const inv = await (this.db as any).invoices.findFirst({
      where: { id: invoiceId, org_id: orgId },
    });
    if (!inv) throw new InvoiceNotFoundError();

    // 2. Resolve current state
    const current = await this.resolveCurrentState(String(inv['lifecycle_state_id']));
    if (current.isTerminal) throw new InvoiceTerminalStateError(current.stateKey);

    // 3. Validate transition (only DRAFT→SUBMITTED for TENANT_USER via this method)
    if (!TENANT_USER_ALLOWED_TO.has(toStateKey)) {
      throw new InvoiceTransitionNotAllowedError(current.stateKey, toStateKey);
    }
    if (current.stateKey !== TTP_INVOICE_STATE.DRAFT && toStateKey === TTP_INVOICE_STATE.SUBMITTED) {
      throw new InvoiceTransitionNotAllowedError(current.stateKey, toStateKey);
    }

    // 4. Resolve target lifecycle_state_id
    const newStateId = await this.resolveLifecycleStateId(toStateKey);

    // 5. Update invoice
    const updated = await (this.db as any).invoices.update({
      where: { id: invoiceId },
      data: { lifecycle_state_id: newStateId, updated_at: new Date() },
    });

    // 6. Write log
    await this.writeLifecycleLog({
      orgId,
      invoiceId,
      fromStateKey: current.stateKey,
      toStateKey,
      actorUserId: userId,
      actorAdminId: null,
      actorType: TTP_ACTOR_TYPE.TENANT_USER,
      actorRole: 'SELLER',
      reason,
      requestId: randomUUID(),
    });

    return this.toTenantRecord(updated, toStateKey);
  }

  // ── Buyer methods ───────────────────────────────────────────────────────────

  async getBuyerInvoicesForTrade(
    buyerOrgId: string,
    tradeId: string,
  ): Promise<BuyerInvoiceRecord[]> {
    const rows = await (this.db as any).invoices.findMany({
      where: { trade_id: tradeId, buyer_org_id: buyerOrgId },
      orderBy: { created_at: 'desc' },
    });

    const records: BuyerInvoiceRecord[] = [];
    for (const row of rows) {
      const state = await this.resolveCurrentState(String(row['lifecycle_state_id']));
      records.push(this.toBuyerRecord(row, state.stateKey));
    }
    return records;
  }

  /**
   * Buyer action on an invoice.
   *
   * Supported actions (from §34 allowed_transitions):
   *   ACKNOWLEDGE — no state change; writes a lifecycle log for audit.
   *   DISPUTE     — transitions to DISPUTED from SUBMITTED or UNDER_REVIEW.
   *
   * Buyer visibility: buyer_org_id must match the authenticated org.
   */
  async buyerAction(
    buyerOrgId: string,
    invoiceId: string,
    action: 'ACKNOWLEDGE' | 'DISPUTE',
    reason: string,
    userId: string | null,
  ): Promise<{ acknowledged: boolean; new_state_key: string }> {
    // 1. Load invoice — match by id + buyer_org_id
    const inv = await (this.db as any).invoices.findFirst({
      where: { id: invoiceId, buyer_org_id: buyerOrgId },
    });
    if (!inv) throw new InvoiceBuyerMismatchError();

    // 2. Resolve current state
    const current = await this.resolveCurrentState(String(inv['lifecycle_state_id']));
    if (current.isTerminal) throw new InvoiceTerminalStateError(current.stateKey);

    if (action === 'ACKNOWLEDGE') {
      // Write audit log, no state change
      await this.writeLifecycleLog({
        orgId: String(inv['org_id']),
        invoiceId,
        fromStateKey: current.stateKey,
        toStateKey: current.stateKey,
        actorUserId: userId,
        actorAdminId: null,
        actorType: TTP_ACTOR_TYPE.TENANT_USER,
        actorRole: 'BUYER',
        reason: reason || 'Buyer acknowledged invoice',
        requestId: randomUUID(),
      });
      return { acknowledged: true, new_state_key: current.stateKey };
    }

    if (action === 'DISPUTE') {
      if (!BUYER_DISPUTABLE_FROM.has(current.stateKey)) {
        throw new InvoiceBuyerActionNotAllowedError(
          `Cannot dispute an invoice in state '${current.stateKey}'. ` +
            `Dispute is only permitted from SUBMITTED or UNDER_REVIEW.`,
        );
      }

      const disputedStateId = await this.resolveLifecycleStateId(
        TTP_INVOICE_STATE.DISPUTED,
      );

      await (this.db as any).invoices.update({
        where: { id: invoiceId },
        data: { lifecycle_state_id: disputedStateId, updated_at: new Date() },
      });

      await this.writeLifecycleLog({
        orgId: String(inv['org_id']),
        invoiceId,
        fromStateKey: current.stateKey,
        toStateKey: TTP_INVOICE_STATE.DISPUTED,
        actorUserId: userId,
        actorAdminId: null,
        actorType: TTP_ACTOR_TYPE.TENANT_USER,
        actorRole: 'BUYER',
        reason,
        requestId: randomUUID(),
      });

      return { acknowledged: false, new_state_key: TTP_INVOICE_STATE.DISPUTED };
    }

    throw new InvoiceBuyerActionNotAllowedError(`Unknown action: ${action}`);
  }

  // ── Admin (control-plane) methods ───────────────────────────────────────────

  async adminListInvoices(filters?: AdminInvoiceListFilters): Promise<AdminInvoiceRecord[]> {
    const where: Record<string, unknown> = {};
    if (filters?.org_id) where['org_id'] = filters.org_id;
    if (filters?.trade_id) where['trade_id'] = filters.trade_id;

    const rows = await (this.db as any).invoices.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: filters?.limit ?? 50,
      skip: filters?.offset ?? 0,
    });

    const records: AdminInvoiceRecord[] = [];
    for (const row of rows) {
      const state = await this.resolveCurrentState(String(row['lifecycle_state_id']));
      if (filters?.state_key && state.stateKey !== filters.state_key) continue;
      records.push(this.toAdminRecord(row, state.stateKey));
    }
    return records;
  }

  async adminGetInvoice(invoiceId: string): Promise<AdminInvoiceRecord> {
    const inv = await (this.db as any).invoices.findFirst({
      where: { id: invoiceId },
    });
    if (!inv) throw new InvoiceNotFoundError();
    const state = await this.resolveCurrentState(String(inv['lifecycle_state_id']));
    return this.toAdminRecord(inv, state.stateKey);
  }

  /**
   * Admin lifecycle transition.
   *
   * Allowed admin transitions from §34 seeds (PLATFORM_ADMIN):
   *   SUBMITTED      → UNDER_REVIEW
   *   UNDER_REVIEW   → VERIFIED      (requires_maker_checker: true)
   *   UNDER_REVIEW   → INELIGIBLE
   *   VERIFIED       → SUPERSEDED
   *   DISPUTED       → UNDER_REVIEW
   *   INELIGIBLE     → UNDER_REVIEW  (reconsideration)
   *   DRAFT/SUBMITTED/UNDER_REVIEW/DISPUTED → WITHDRAWN
   *
   * Maker-checker (OQ-TTP-003): UNDER_REVIEW → VERIFIED requires both
   * maker_user_id and checker_user_id when gross_amount >= threshold (default 500,000 INR).
   *
   * @param adminId  authenticated admin UUID (from request.adminId)
   * @param invoiceId  target invoice UUID
   * @param input  transition parameters including to_state_key + reason
   */
  async adminTransition(
    adminId: string,
    invoiceId: string,
    input: AdminTransitionInput,
  ): Promise<AdminInvoiceRecord> {
    const { to_state_key, reason, maker_user_id, checker_user_id } = input;

    // 1. Load invoice (cross-tenant — admin context sets is_admin=true)
    const inv = await (this.db as any).invoices.findFirst({
      where: { id: invoiceId },
    });
    if (!inv) throw new InvoiceNotFoundError();

    // 2. Resolve current state
    const current = await this.resolveCurrentState(String(inv['lifecycle_state_id']));

    // Terminal guard — §34: INELIGIBLE→UNDER_REVIEW is an admin override (reconsideration)
    // but the migration marks INELIGIBLE as is_irreversible=true. To stay safe, we honour
    // the seeded allowed_transitions and let INELIGIBLE→UNDER_REVIEW proceed (admin override).
    // WITHDRAWN and SUPERSEDED have no outbound transitions — block them.
    if (
      current.stateKey === TTP_INVOICE_STATE.WITHDRAWN ||
      current.stateKey === TTP_INVOICE_STATE.EXPIRED ||
      current.stateKey === TTP_INVOICE_STATE.SUPERSEDED
    ) {
      throw new InvoiceTerminalStateError(current.stateKey);
    }

    // 3. Validate transition against seeded allowed_transitions for PLATFORM_ADMIN
    const adminAllowedFrom = getAdminAllowedFromStates(to_state_key);
    if (!adminAllowedFrom.has(current.stateKey)) {
      throw new InvoiceTransitionNotAllowedError(current.stateKey, to_state_key);
    }

    // 4. Maker-checker gate for UNDER_REVIEW → VERIFIED (OQ-TTP-003)
    if (to_state_key === TTP_INVOICE_STATE.VERIFIED) {
      const threshold = await this.resolveMcThresholdInr();
      const grossAmount = parseFloat(String(inv['gross_amount']));
      if (grossAmount >= threshold) {
        if (!maker_user_id || !checker_user_id) {
          throw new InvoiceMakerCheckerRequiredError();
        }
      }
    }

    // 5. Resolve target lifecycle_state_id
    const newStateId = await this.resolveLifecycleStateId(to_state_key);

    // 6. Update invoice
    const updated = await (this.db as any).invoices.update({
      where: { id: invoiceId },
      data: { lifecycle_state_id: newStateId, updated_at: new Date() },
    });

    // 7. Write lifecycle log
    await this.writeLifecycleLog({
      orgId: String(inv['org_id']),
      invoiceId,
      fromStateKey: current.stateKey,
      toStateKey: to_state_key,
      actorUserId: null,
      actorAdminId: adminId,
      actorType: TTP_ACTOR_TYPE.PLATFORM_ADMIN,
      actorRole: 'PLATFORM_ADMIN',
      reason,
      makerUserId: maker_user_id ?? null,
      checkerUserId: checker_user_id ?? null,
      requestId: randomUUID(),
    });

    return this.toAdminRecord(updated, to_state_key);
  }
}

// ─── Local helper: allowed source states per target (PLATFORM_ADMIN) ────────────

/**
 * Returns the set of valid 'from' states for a given 'to' state under PLATFORM_ADMIN.
 * Derived from §34 INVOICE allowed_transitions seeds.
 */
function getAdminAllowedFromStates(toStateKey: string): ReadonlySet<string> {
  switch (toStateKey) {
    case TTP_INVOICE_STATE.UNDER_REVIEW:
      // SUBMITTED→UNDER_REVIEW, DISPUTED→UNDER_REVIEW, INELIGIBLE→UNDER_REVIEW
      return new Set([
        TTP_INVOICE_STATE.SUBMITTED,
        TTP_INVOICE_STATE.DISPUTED,
        TTP_INVOICE_STATE.INELIGIBLE,
      ]);
    case TTP_INVOICE_STATE.VERIFIED:
      // UNDER_REVIEW→VERIFIED
      return new Set([TTP_INVOICE_STATE.UNDER_REVIEW]);
    case TTP_INVOICE_STATE.INELIGIBLE:
      // UNDER_REVIEW→INELIGIBLE
      return new Set([TTP_INVOICE_STATE.UNDER_REVIEW]);
    case TTP_INVOICE_STATE.SUPERSEDED:
      // VERIFIED→SUPERSEDED
      return new Set([TTP_INVOICE_STATE.VERIFIED]);
    case TTP_INVOICE_STATE.WITHDRAWN:
      // DRAFT/SUBMITTED/UNDER_REVIEW/DISPUTED → WITHDRAWN (TENANT_ADMIN + PLATFORM_ADMIN)
      return new Set([
        TTP_INVOICE_STATE.DRAFT,
        TTP_INVOICE_STATE.SUBMITTED,
        TTP_INVOICE_STATE.UNDER_REVIEW,
        TTP_INVOICE_STATE.DISPUTED,
      ]);
    default:
      return new Set();
  }
}
