/**
 * NetworkInvoiceService — TEXQTIC-NC-PHASE1-INVOICE-FOUNDATION-001
 *
 * Standalone service for Network Commerce invoices.
 * Covers: POOL_ORDER, SYNDICATE_EXECUTION, VCO_DELIVERY invoice types.
 *
 * Design decision (Phase 0 Validation Report, Option B):
 *   Uses a SEPARATE network_invoices table — no dependency on the existing
 *   `invoices` table or `InvoiceService`. The TTP/Trade invoice flow is not
 *   touched by this service.
 *
 * No Trade dependency: party fields (issuer_org_id, payer_org_id, currency)
 *   are supplied by the caller, not derived from a Trade entity.
 *
 * Lifecycle transitions deferred: status changes will flow through
 *   NetworkLifecycleLog once the NC lifecycle packet is applied.
 *
 * D-017-A: org_id is ALWAYS from JWT/dbContext — never from caller body.
 */

import { randomUUID } from 'crypto';
import type { PrismaClient } from '@prisma/client';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Valid NC invoice types. */
export const NC_INVOICE_TYPE = {
  POOL_ORDER:           'POOL_ORDER',
  SYNDICATE_EXECUTION:  'SYNDICATE_EXECUTION',
  VCO_DELIVERY:         'VCO_DELIVERY',
} as const;

export type NcInvoiceType = (typeof NC_INVOICE_TYPE)[keyof typeof NC_INVOICE_TYPE];

/** Valid NC entity types (must match network_invoices coherence CHECK constraint). */
export const NC_ENTITY_TYPE_FOR_INVOICE: Record<NcInvoiceType, string> = {
  POOL_ORDER:           'POOL',
  SYNDICATE_EXECUTION:  'SYNDICATE',
  VCO_DELIVERY:         'VCO_CHAIN',
};

/** Valid invoice status values. Initial status on creation is always DRAFT. */
export const NC_INVOICE_STATUS = {
  DRAFT:     'DRAFT',
  SUBMITTED: 'SUBMITTED',
  VERIFIED:  'VERIFIED',
  SETTLED:   'SETTLED',
  CANCELLED: 'CANCELLED',
  DISPUTED:  'DISPUTED',
} as const;

const VALID_INVOICE_TYPES = new Set<string>(Object.values(NC_INVOICE_TYPE));

// ─── Error Classes ───────────────────────────────────────────────────────────

export class NetworkInvoiceInvalidTypeError extends Error {
  constructor(invoiceType: string) {
    super(
      `Invalid NC invoice type '${invoiceType}'. ` +
      `Valid types: ${[...VALID_INVOICE_TYPES].join(', ')}`,
    );
    this.name = 'NetworkInvoiceInvalidTypeError';
  }
}

export class NetworkInvoiceInvalidAmountError extends Error {
  constructor() {
    super('gross_amount must be a positive number greater than zero');
    this.name = 'NetworkInvoiceInvalidAmountError';
  }
}

export class NetworkInvoiceMissingIssuerError extends Error {
  constructor() {
    super('issuer_org_id is required');
    this.name = 'NetworkInvoiceMissingIssuerError';
  }
}

export class NetworkInvoiceMissingCurrencyError extends Error {
  constructor() {
    super('currency is required');
    this.name = 'NetworkInvoiceMissingCurrencyError';
  }
}

export class NetworkInvoiceMissingEntityError extends Error {
  constructor() {
    super('network_entity_id is required');
    this.name = 'NetworkInvoiceMissingEntityError';
  }
}

export class NetworkInvoiceDuplicateError extends Error {
  constructor() {
    super(
      'A network invoice with this invoice_number already exists for this ' +
      'org + invoice_type + entity combination',
    );
    this.name = 'NetworkInvoiceDuplicateError';
  }
}

export class NetworkInvoiceNotFoundError extends Error {
  constructor() {
    super('Network invoice not found');
    this.name = 'NetworkInvoiceNotFoundError';
  }
}

// ─── Input / Record Types ────────────────────────────────────────────────────

export interface CreateNetworkInvoiceInput {
  /** NC invoice type — determines network_entity_type automatically. */
  invoice_type: string;
  /** UUID of the NC entity (pool, syndicate, vco_chain). Soft reference. */
  network_entity_id: string;
  /** Unique invoice number scoped to org + type + entity. */
  invoice_number: string;
  /** ISO date string for invoice date. */
  invoice_date: string;
  /** Optional ISO date string for payment due date. */
  due_date?: string | null;
  /** ISO 4217 currency code (e.g. 'INR', 'USD'). */
  currency: string;
  /** Invoice gross amount — must be positive. */
  gross_amount: number;
  /** Organization issuing this invoice. */
  issuer_org_id: string;
  /** Organization obligated to pay (may be null at DRAFT stage). */
  payer_org_id?: string | null;
  /** Organization receiving goods/services (may be null at DRAFT stage). */
  recipient_org_id?: string | null;
  /** Optional URL to supporting invoice document. */
  document_url?: string | null;
  /** Optional free-form notes. */
  notes?: string | null;
  /** Optional structured metadata (JSONB). */
  metadata?: Record<string, unknown> | null;
}

/** Caller-visible network invoice record. */
export interface NetworkInvoiceRecord {
  id: string;
  org_id: string;
  invoice_type: string;
  network_entity_type: string;
  network_entity_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  currency: string;
  gross_amount: string;
  issuer_org_id: string;
  payer_org_id: string | null;
  recipient_org_id: string | null;
  status: string;
  document_url: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class NetworkInvoiceService {
  constructor(private readonly db: PrismaClient) {}

  // ── Private helpers ──────────────────────────────────────────────────────

  private toRecord(row: Record<string, unknown>): NetworkInvoiceRecord {
    return {
      id:                   String(row['id']),
      org_id:               String(row['org_id']),
      invoice_type:         String(row['invoice_type']),
      network_entity_type:  String(row['network_entity_type']),
      network_entity_id:    String(row['network_entity_id']),
      invoice_number:       String(row['invoice_number']),
      invoice_date:         (row['invoice_date'] as Date).toISOString(),
      due_date:             row['due_date'] ? (row['due_date'] as Date).toISOString() : null,
      currency:             String(row['currency']),
      gross_amount:         String(row['gross_amount']),
      issuer_org_id:        String(row['issuer_org_id']),
      payer_org_id:         row['payer_org_id'] ? String(row['payer_org_id']) : null,
      recipient_org_id:     row['recipient_org_id'] ? String(row['recipient_org_id']) : null,
      status:               String(row['status']),
      document_url:         row['document_url'] ? String(row['document_url']) : null,
      notes:                row['notes'] ? String(row['notes']) : null,
      metadata:             row['metadata'] != null
                              ? (row['metadata'] as Record<string, unknown>)
                              : null,
      created_by_user_id:   row['created_by_user_id'] ? String(row['created_by_user_id']) : null,
      created_at:           (row['created_at'] as Date).toISOString(),
      updated_at:           (row['updated_at'] as Date).toISOString(),
    };
  }

  // ── Validation ───────────────────────────────────────────────────────────

  /**
   * Validates all required fields for a network invoice before creation.
   * Throws a typed error on the first validation failure.
   */
  private validateCreateInput(input: CreateNetworkInvoiceInput): void {
    if (!VALID_INVOICE_TYPES.has(input.invoice_type)) {
      throw new NetworkInvoiceInvalidTypeError(input.invoice_type);
    }
    if (!input.network_entity_id || input.network_entity_id.trim() === '') {
      throw new NetworkInvoiceMissingEntityError();
    }
    if (!input.issuer_org_id || input.issuer_org_id.trim() === '') {
      throw new NetworkInvoiceMissingIssuerError();
    }
    if (!input.currency || input.currency.trim() === '') {
      throw new NetworkInvoiceMissingCurrencyError();
    }
    if (
      typeof input.gross_amount !== 'number' ||
      !Number.isFinite(input.gross_amount) ||
      input.gross_amount <= 0
    ) {
      throw new NetworkInvoiceInvalidAmountError();
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Create a new Network Commerce invoice in DRAFT status.
   *
   * @param orgId  - Tenant org (from JWT/dbContext — NOT from caller body).
   * @param userId - User ID (nullable for system-triggered creation).
   * @param input  - Invoice data (no trade_id required).
   * @returns      NetworkInvoiceRecord for the newly created invoice.
   */
  async createNetworkInvoice(
    orgId: string,
    userId: string | null,
    input: CreateNetworkInvoiceInput,
  ): Promise<NetworkInvoiceRecord> {
    // 1. Validate input — throws on first failure
    this.validateCreateInput(input);

    const invoiceType = input.invoice_type as NcInvoiceType;
    const networkEntityType = NC_ENTITY_TYPE_FOR_INVOICE[invoiceType];

    // 2. Duplicate check: same (org_id, invoice_type, entity_type, entity_id, invoice_number)
    const existing = await (this.db as any).network_invoices.findFirst({
      where: {
        org_id:               orgId,
        invoice_type:         invoiceType,
        network_entity_type:  networkEntityType,
        network_entity_id:    input.network_entity_id,
        invoice_number:       input.invoice_number,
      },
      select: { id: true },
    });
    if (existing) throw new NetworkInvoiceDuplicateError();

    // 3. Insert DRAFT invoice — no trade_id, no lifecycle_state_id FK
    const row = await (this.db as any).network_invoices.create({
      data: {
        id:                   randomUUID(),
        org_id:               orgId,
        invoice_type:         invoiceType,
        network_entity_type:  networkEntityType,
        network_entity_id:    input.network_entity_id,
        invoice_number:       input.invoice_number,
        invoice_date:         new Date(input.invoice_date),
        due_date:             input.due_date ? new Date(input.due_date) : null,
        currency:             input.currency,
        gross_amount:         input.gross_amount,
        issuer_org_id:        input.issuer_org_id,
        payer_org_id:         input.payer_org_id ?? null,
        recipient_org_id:     input.recipient_org_id ?? null,
        status:               NC_INVOICE_STATUS.DRAFT,
        document_url:         input.document_url ?? null,
        notes:                input.notes ?? null,
        metadata:             input.metadata ?? null,
        created_by_user_id:   userId ?? null,
        created_at:           new Date(),
        updated_at:           new Date(),
      },
    });

    return this.toRecord(row);
  }

  /**
   * Fetch a single NetworkInvoice by id within the caller's org scope.
   * Returns null if not found (callers may throw NetworkInvoiceNotFoundError).
   *
   * @param orgId - Tenant org (from JWT/dbContext).
   * @param id    - UUID of the network invoice.
   */
  async getNetworkInvoiceById(
    orgId: string,
    id: string,
  ): Promise<NetworkInvoiceRecord | null> {
    const row = await (this.db as any).network_invoices.findFirst({
      where: { id, org_id: orgId },
    });
    if (!row) return null;
    return this.toRecord(row);
  }

  /**
   * List all NetworkInvoices for a specific pool within the caller's org scope.
   * Returns invoices where network_entity_type = 'POOL' and network_entity_id = poolId.
   * Ordered by created_at descending.
   *
   * @param orgId  - Tenant org (from JWT/dbContext — D-017-A).
   * @param poolId - UUID of the network pool (soft reference).
   */
  async listNetworkInvoicesForPool(
    orgId: string,
    poolId: string,
  ): Promise<NetworkInvoiceRecord[]> {
    const rows = await (this.db as any).network_invoices.findMany({
      where: {
        org_id:               orgId,
        network_entity_type:  'POOL',
        network_entity_id:    poolId,
      },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((r: Record<string, unknown>) => this.toRecord(r));
  }
}
